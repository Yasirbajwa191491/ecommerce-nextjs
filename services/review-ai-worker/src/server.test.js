import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './server.js';
async function withServer(secret, handlers, run) {
 process.env.AI_WORKER_SECRET=secret;
 const server=createApp(handlers).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise(resolve=>server.close(resolve)); }
}
for (const secret of ['', 'dev-secret']) test('fails closed for missing/default configuration '+(secret?'default':'missing'), async()=> {
 await withServer(secret,{},async base=>{const response=await fetch(base+'/moderate',{method:'POST',headers:{'content-type':'application/json'},body:'{"text":"fixture"}'});assert.equal(response.status,401);});
});
test('valid secret allows inference; wrong secret, oversized body, and errors stay safe',async()=>{
 const secret='synthetic-worker-fixture-key-with-32-chars';
 await withServer(secret,{moderateText:async()=>({safe:true}),embedText:async()=>{throw new Error('private-internal-detail');}},async base=>{
  const headers={'content-type':'application/json','x-ai-worker-key':secret};
  assert.equal((await fetch(base+'/moderate',{method:'POST',headers:{...headers,'x-ai-worker-key':'wrong'},body:'{}'})).status,401);
  assert.deepEqual(await (await fetch(base+'/moderate',{method:'POST',headers,body:'{}'})).json(),{safe:true});
  assert.equal((await fetch(base+'/moderate',{method:'POST',headers,body:JSON.stringify({text:'x'.repeat(300000)})})).status,413);
  const failure=await fetch(base+'/embed',{method:'POST',headers,body:'{}'});assert.equal(failure.status,500);assert.doesNotMatch(await failure.text(),/private-internal/);
 });
});
test('keeps a strict inference concurrency bound',async()=>{
 const secret='synthetic-worker-fixture-key-with-32-chars';let release;const blocked=new Promise(resolve=>{release=resolve;});let active=0;
 await withServer(secret,{moderateText:async()=>{active++;await blocked;return {safe:true};}},async base=>{
  const options={method:'POST',headers:{'content-type':'application/json','x-ai-worker-key':secret},body:'{}'};
  const first=fetch(base+'/moderate',options),second=fetch(base+'/moderate',options);
  while(active<2) await new Promise(resolve=>setTimeout(resolve,2));
  assert.equal((await fetch(base+'/moderate',options)).status,429);release();await Promise.all([first,second]);
 });
});
