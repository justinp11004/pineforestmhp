import {currentLots} from '../../../db/lots';
import {reply} from '../../../lib/http';
export async function GET(){try{return reply({lots:await currentLots()})}catch{return reply({ok:false,error:'Current availability is unavailable. Please ask the team.'},503)}}
