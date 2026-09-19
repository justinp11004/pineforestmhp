export const reply = (body: unknown, status = 200, headers: Record<string,string> = {}) => Response.json(body, {status, headers: {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export function sameOrigin(request: Request) {const origin=request.headers.get('origin');return !!origin && origin===new URL(request.url).origin && request.headers.get('sec-fetch-site')!=='cross-site'}
export async function readJson(request: Request, limit=12000): Promise<Record<string,unknown>> {
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new Error('content-type');
  if(Number(request.headers.get('content-length')||0)>limit)throw new Error('body-limit');
  const reader=request.body?.getReader();if(!reader)throw new Error('body-invalid');
  let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error('body-limit')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  let data:unknown;try{data=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new Error('body-invalid')}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('body-invalid');return data as Record<string,unknown>;
}
export function bodyError(error:unknown){const code=error instanceof Error?error.message:'';return code==='content-type'?reply({ok:false,error:'Enable JavaScript and send your inquiry using the website form.'},415):code==='body-limit'?reply({ok:false,error:'Your request is too long. Shorten your message and try again.'},413):code==='body-invalid'?reply({ok:false,error:'Please check your details and try again.'},400):null}
export async function sha256(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('')}
