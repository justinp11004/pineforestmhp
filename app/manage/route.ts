import html from '../../content/manage.html?raw';
import {currentAdmin} from '../../lib/admin';
import {getChatGPTUser,chatGPTSignInPath} from '../chatgpt-auth';
export const dynamic='force-dynamic';
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export async function GET(){
  try{
    if(await currentAdmin())return new Response(html,{headers});
    const user=await getChatGPTUser();
    const title=user?'This area is for the Pine Forest owner.':'Pine Forest management';
    const action=user?'<a href="/signout-with-chatgpt?return_to=%2Fmanage" target="_top">Sign out and use your owner account</a>':`<a href="${chatGPTSignInPath('/manage')}" target="_top">Sign in with ChatGPT</a>`;
    return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pine Forest | Management</title><link rel="icon" href="/assets/pine-forest-emblem.png"></head><body style="margin:0;background:#f3f7f4;color:#10291f;font:16px/1.7 Arial,sans-serif"><main style="max-width:480px;margin:12vh auto;padding:32px;background:white;border:1px solid #d2dfd7;border-radius:12px"><img src="/assets/pine-forest-emblem.png" alt="" width="48" height="48"><h1>${title}</h1><p>Review inquiries and manage homesite availability. This area is restricted to the site owner.</p><p>${action}</p><p><a href="/">Return to the website</a></p></main></body></html>`,{status:user?403:200,headers});
  }catch{return new Response('Management is temporarily unavailable. Please try again.',{status:503,headers})}
}
