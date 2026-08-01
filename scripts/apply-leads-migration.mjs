import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.pg.tmp', override: true });
dotenv.config({ path: 'consultorio-backend/.env' });

let url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url || url.includes('[SENSITIVE]')) {
  console.error('NO_PG_URL');
  process.exit(2);
}

// Evitar verify-full estricto del connection string de Vercel/Supabase
url = url.replace(/[?&]sslmode=[^&]*/g, '');
url += (url.includes('?') ? '&' : '?') + 'sslmode=no-verify';

const sql = fs.readFileSync('supabase/migrations/20260721000000_leads.sql', 'utf8');
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query(sql);
const r = await client.query(
  `select column_name from information_schema.columns where table_schema='public' and table_name='leads' order by ordinal_position`
);
console.log('OK', r.rows.map((x) => x.column_name).join(','));
await client.end();
