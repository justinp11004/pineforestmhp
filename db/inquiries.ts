import { env } from 'cloudflare:workers';
export function inquiryDb() {
  const db = (env as unknown as {DB?: D1Database}).DB;
  if (!db) throw new Error('Inquiry storage is unavailable');
  return db;
}
