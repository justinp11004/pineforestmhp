import { inquiryDb } from './inquiries';
import lots from '../content/lots.json';
export async function currentLots(){
  const data=await inquiryDb().prepare('SELECT id,status,revision,updated_at FROM lot_availability').all<{id:string,status:string,revision:number,updated_at:number}>();
  if(!data.success)throw new Error('Availability unavailable');
  const updates=new Map(data.results.map(l=>[l.id,l]));
  return lots.map(l=>({id:l.id,status:'unconfirmed',revision:0,updated_at:0,...updates.get(l.id)}));
}
