/** Bound body allocation independently of Content-Length (including chunked requests). */
export async function readLimitedText(input: Request | Response, limit: number): Promise<string> {
 const reader = input.body?.getReader(); if (!reader) throw new Error("Missing body");
 const chunks: Uint8Array[] = []; let size = 0;
 try { for (;;) { const {value, done} = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) throw new Error("Body too large"); chunks.push(value); } }
 finally { await reader.cancel(); }
 return new TextDecoder().decode(Buffer.concat(chunks));
}
