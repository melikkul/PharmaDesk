import pg from "pg";
const { Pool } = pg;

const URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PGURL;

if (!URL) {
  throw new Error(
    "No Postgres connection string. Set DATABASE_URL (or POSTGRES_URL / PGURL) in docker/backend/.env"
  );
}

const useSSL = !/^(postgres:\/\/)?(localhost|127\.0\.0\.1)/i.test(URL);

export const pool = new Pool({
  connectionString: URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

export async function ping() {
  const r = await pool.query("select 1 as ok");
  return "Connected to Postgres!";
}
