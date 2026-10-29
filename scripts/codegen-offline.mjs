// Offline application API generation using the installed Convex template.
// Component metadata is retained from the last authenticated component codegen.
// Run full `convex codegen` when development deployment credentials are available.
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const target = path.join(root, 'convex/_generated/api.d.ts');
const existing = await fs.readFile(target, 'utf8');
const components = existing.slice(existing.indexOf('export declare const components:'));
if (!components.startsWith('export declare const components:')) throw new Error('Missing component metadata');
const modules = new Set([...existing.matchAll(/import type \* as \w+ from "\.\.\/(.+)\.js";/g)].map(m => m[1]+'.ts'));
async function discover(dir) {
 for (const entry of await fs.readdir(dir, {withFileTypes:true})) {
  if (entry.name === '_generated' || entry.name === 'node_modules' || entry.name === 'betterAuth') continue;
  const full=path.join(dir,entry.name);
  if (entry.isDirectory()) await discover(full);
  else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !['schema.ts','convex.config.ts','auth.config.ts'].includes(entry.name)) modules.add(path.relative(path.join(root,'convex'),full));
 }
}
await discover(path.join(root,'convex'));
const out = path.join(root,'.artifacts/convex-api-template.mjs');
await build({entryPoints:[path.join(root,'node_modules/convex/src/cli/codegen_templates/api.ts')],bundle:true,platform:'node',format:'esm',outfile:out});
const {apiCodegen} = await import(pathToFileURL(out).href);
const generated = apiCodegen([...modules].sort(),{useTypeScript:false});
await fs.writeFile(target,(generated.DTS+'\n'+components).split('\n').map(line=>line.trimEnd()).join('\n'));
