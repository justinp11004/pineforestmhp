import {inquiryDb} from '../../../db/inquiries';
import {currentLots} from '../../../db/lots';
import homes from '../../../content/models.json';
import {reply,sameOrigin,readJson,bodyError,sha256} from '../../../lib/http';
const rentalIntents=new Set(['2-bedroom rental','3-bedroom rental','2-bedroom rental - Section 8','3-bedroom rental - Section 8']);
const intents=new Set([...rentalIntents,'Request a complete quote','Plan a visit','Help choosing a home','Financing information','Investor inquiry','Move my own home']);
const timelines=new Set(['','Within 3 months','3–6 months','6+ months']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
  if(!sameOrigin(request))return reply({ok:false,error:'Please submit your request from the Pine Forest website.'},403);
  try{
    const data=await readJson(request),fields:Record<string,string>={};
    const field=(key:string,max:number)=>{const value=data[key];if(value!==undefined&&typeof value!=='string'){fields[key]='Please use a text value.';return ''}const text=(value as string|undefined)?.trim()||'';if(text.length>max)fields[key]=`Use ${max} characters or fewer.`;return text};
    const name=field('name',100),email=field('email',160).toLowerCase(),phone=field('phone',30),homeId=field('home',10),lotId=field('lot',10),intent=field('intent',60),message=field('message',2000),id=field('requestId',40),timeline=field('timeline',30),contactMethod=field('contactMethod',10)||'email',source=field('source',100)||'direct',campaign=field('campaign',150);
    if(name.length<2)fields.name='Enter your first and last name.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fields.email='Enter a valid email address, such as you@example.com.';
    const digits=phone.replace(/\D/g,'');if((phone&&!/^1?\d{10}$/.test(digits))||(contactMethod==='phone'&&!phone))fields.phone='Enter a valid 10-digit phone number, optionally starting with +1.';
    if(!['email','phone'].includes(contactMethod))fields.contactMethod='Choose email or phone call.';
    if(rentalIntents.has(intent)&&(homeId||lotId))fields.intent='For a rental inquiry, leave the purchase home and site-plan lot blank.';
    if(intent==='Move my own home'&&homeId)fields.home='For an owned-home move, leave the new-home model blank.';
    if(!intents.has(intent))fields.intent='Choose how we can help.';
    if(!timelines.has(timeline))fields.timeline='Choose a timeline from the list.';
    if(data.consent!==true)fields.consent='Please agree to be contacted about this inquiry.';
    const home=homes.find(h=>h.id===homeId);if(homeId&&!home)fields.home='Choose a home from the collection.';
    if(!uuid.test(id)||field('website',100))return reply({ok:false,error:'Please refresh the form and try again.'},400);
    if(Object.keys(fields).length)return reply({ok:false,error:'Please check the highlighted details.',fields},400);
    const db=inquiryDb();
    const fingerprint=await sha256(JSON.stringify({name,email,phone,homeId,lotId,intent,message,timeline,contactMethod,source,campaign,consent:true}));
    const find=()=>db.prepare('SELECT reference,payload_hash FROM inquiries WHERE id = ?').bind(id).first<{reference:string,payload_hash:string}>();
    const replay=(row:{reference:string,payload_hash:string})=>row.payload_hash===fingerprint?reply({ok:true,reference:row.reference}):reply({ok:false,error:'This request was already saved with different details. Start a new inquiry to send your changes.'},409);
    const prior=await find();if(prior)return replay(prior);
    const lots=await currentLots(),lot=lots.find(l=>l.id===lotId);
    if(lotId&&(!lot||['reserved','occupied'].includes(lot.status)))return reply({ok:false,error:'That lot is no longer available for inquiry. Choose another lot or let the team help.',fields:{lot:'Choose another lot or “Help me choose a lot”.'}},409);
    const now=Date.now(),ip=request.headers.get('cf-connecting-ip');
    // Cover both daily network hashes when a rolling hour crosses midnight.
    // Without a trusted network header, limit the supplied email instead.
    const network=ip?'network:'+ip:'email:'+email;
    const hash=(time:number)=>sha256(new Date(time).toISOString().slice(0,10)+':pine-forest:'+network);
    const [networkHash,previousHash]=await Promise.all([hash(now),hash(now-3600000)]);
    const reference='PF-'+crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
    const result=await db.prepare(`INSERT INTO inquiries
      (id,reference,name,email,phone,home_id,home_name,intent,message,consent,created_at,network_hash,payload_hash,lot_id,lot_status,timeline,contact_method,source,campaign,consent_version)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
      WHERE (SELECT COUNT(*) FROM inquiries WHERE network_hash IN (?,?) AND created_at > ?)<8
      AND (? = '' OR COALESCE((SELECT status FROM lot_availability WHERE id=?),'unconfirmed') NOT IN ('reserved','occupied'))
      ON CONFLICT(id) DO NOTHING`).bind(id,reference,name,email,phone,homeId,home?.name??(rentalIntents.has(intent)?intent:intent==='Move my own home'?'Move my owned home':'Help me choose'),intent,message,1,now,networkHash,fingerprint,lotId,lot?.status??'',timeline,contactMethod,source,campaign,'2026-09-15',networkHash,previousHash,now-3600000,lotId,lotId).run();
    if(!result.success)throw new Error('Inquiry insert failed');
    const saved=await find();if(saved)return replay(saved);
    if(lotId){const latest=(await currentLots()).find(l=>l.id===lotId);if(latest&&['reserved','occupied'].includes(latest.status))return reply({ok:false,error:'That lot’s availability changed. Please choose another lot or ask the team to help.',fields:{lot:'Choose another lot.'}},409);}
    return reply({ok:false,error:'Several inquiries were sent from this connection. Please try again in an hour.'},429,{'Retry-After':'3600'});
  }catch(error){const specific=bodyError(error);if(specific)return specific;console.error('Inquiry storage unavailable');return reply({ok:false,error:'We couldn’t save your request right now. Your details are still here—please try again.'},503)}
}
export function GET(){return reply({ok:false,error:'Use the Pine Forest website inquiry form.'},405,{'Allow':'POST'})}
