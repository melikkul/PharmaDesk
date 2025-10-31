import pg from "pg";
const { Pool } = pg;
import 'dotenv/config';

const URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PGURL;

if (!URL) {
  throw new Error(
    "No Postgres connection string. Set DATABASE_URL (or POSTGRES_URL / PGURL) in docker/backend/.env"
  );
}

const useSSL = !/(localhost|127\.0\.0\.1|db)/i.test(URL);

// "export const pool" olarak export et, "export default" değil
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL, // SSL mantığını burada kullan
});

export async function ping() {
  const r = await pool.query("select 1 as ok");
  return "Connected to Postgres!";
}