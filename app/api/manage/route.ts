import {currentAdmin} from '../../../lib/admin';
import {reply,readJson,sameOrigin,bodyError} from '../../../lib/http';
import {inquiryDb} from '../../../db/inquiries';
import {currentLots} from '../../../db/lots';
const stages=new Set(['new','contacted','visit planned','closed','archived']);
const statuses=new Set(['unconfirmed','available','reserved','occupied']);
export async function GET(request:Request){
  if(!await currentAdmin())return reply({ok:false,error:'Owner sign-in is required.'},403);
  try{
    const db=inquiryDb(),url=new URL(request.url),stage=url.searchParams.get('stage')||'',path=url.searchParams.get('path')||'',pageText=url.searchParams.get('page')??'0',page=Number(pageText),search=(url.searchParams.get('q')||'').slice(0,100),needle='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
    if(!/^\d+$/.test(pageText)||!Number.isSafeInteger(page)||page<0||page>10000)return reply({ok:false,error:'Choose a valid page number.'},400);
    if(path&&!['purchase','rental','moving','other'].includes(path))return reply({ok:false,error:'Choose a valid inquiry type.'},400);
    if(stage&&!stages.has(stage))return reply({ok:false,error:'Unknown stage.'},400);
    const pathClause="(? = '' OR CASE WHEN intent IN ('2-bedroom rental','3-bedroom rental','2-bedroom rental - Section 8','3-bedroom rental - Section 8') THEN 'rental' WHEN intent='Move my own home' THEN 'moving' WHEN intent='Investor inquiry' THEN 'other' ELSE 'purchase' END = ?)";
    const where="WHERE (? = '' OR status = ?) AND (? = '' OR name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR reference LIKE ? ESCAPE '\\')";
    const queryWhere=where+" AND "+pathClause;
    const binds=[stage,stage,search,needle,needle,needle,path,path];
    const [records,count,stats,lots]=await Promise.all([
      db.prepare(`SELECT id,reference,name,email,phone,home_name,home_id,intent,message,created_at,lot_id,lot_status,timeline,contact_method,source,campaign,status,notes,revision,updated_at FROM inquiries ${queryWhere} ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?`).bind(...binds,page*50).all(),
      db.prepare(`SELECT COUNT(*) AS total FROM inquiries ${queryWhere}`).bind(...binds).first(),
      db.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN status='new' THEN 1 ELSE 0 END) AS new_count,SUM(CASE WHEN intent='Plan a visit' THEN 1 ELSE 0 END) AS visits,SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) AS closed_count FROM inquiries").first(),
      currentLots()
    ]);
    if(!records.success)throw new Error('Read failed');return reply({ok:true,records:records.results,count,stats,lots,page});
  }catch{console.error('Management data unavailable');return reply({ok:false,error:'Could not load your leads. Please try again.'},503)}
}
export async function POST(request:Request){
  const admin=await currentAdmin();if(!admin)return reply({ok:false,error:'Owner sign-in is required.'},403);
  if(!sameOrigin(request))return reply({ok:false,error:'Refresh the management page and try again.'},403);
  try{
    const data=await readJson(request),db=inquiryDb();
    if(typeof data.id!=='string'||!Number.isSafeInteger(data.revision)||Number(data.revision)<0)return reply({ok:false,error:'Refresh this record before saving.'},400);
    const now=Date.now();let changes=0;
    if(data.kind==='inquiry'){
      if(typeof data.status!=='string'||!stages.has(data.status)||typeof data.notes!=='string'||data.notes.length>4000)return reply({ok:false,error:'Choose a valid stage and keep notes under 4,000 characters.'},400);
      const result=await db.prepare('UPDATE inquiries SET status=?,notes=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(data.status,data.notes,now,data.id,data.revision).run();
      if(!result.success)throw new Error('Save failed');changes=result.meta.changes;
    }else if(data.kind==='lot'){
      const lots=await currentLots();if(!lots.some(l=>l.id===data.id)||typeof data.status!=='string'||!statuses.has(data.status))return reply({ok:false,error:'Choose a valid lot and status.'},400);
      if(data.revision===0){const result=await db.prepare('INSERT INTO lot_availability (id,status,revision,updated_at,updated_by) VALUES (?,?,1,?,?) ON CONFLICT(id) DO NOTHING').bind(data.id,data.status,now,admin.userId).run();if(!result.success)throw new Error('Save failed');changes=result.meta.changes;}
      else{const result=await db.prepare('UPDATE lot_availability SET status=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=? AND revision=?').bind(data.status,now,admin.userId,data.id,data.revision).run();if(!result.success)throw new Error('Save failed');changes=result.meta.changes;}
    }else return reply({ok:false,error:'Unknown update.'},400);
    if(!changes)return reply({ok:false,error:'This record changed in another session. Reload it before making further edits.'},409);
    return reply({ok:true,revision:Number(data.revision)+1,updatedAt:now});
  }catch(error){return bodyError(error)||reply({ok:false,error:'Your changes could not be saved. Please try again.'},503)}
}
