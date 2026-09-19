import {getChatGPTUser} from '../app/chatgpt-auth';
// Restricted to the verified Site owner's platform-authenticated email.
// A stable platform user ID must also be present. No client-provided identity is accepted.
const owners=new Set(['jpcapitalinvestments1@gmail.com']);
export async function currentAdmin(){const user=await getChatGPTUser();return user&&owners.has(user.email.trim().toLowerCase())?user:null}
