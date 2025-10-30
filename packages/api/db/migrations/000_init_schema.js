import 'dotenv/config';
import { pool, query } from '../../config/db.js';

const sql = `
CREATE TABLE IF NOT EXISTS drugs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  form TEXT,
  strength TEXT,
  price NUMERIC(10,2) DEFAULT 0
);

INSERT INTO drugs(name, form, strength, price) VALUES
('Aspirin','tablet','100 mg', 89.90),
('Paracetamol','tablet','500 mg', 74.50),
('Ibuprofen','capsule','200 mg', 96.00)
ON CONFLICT DO NOTHING;
`;

async function run() {
  try {
    console.log("Running migration against:", process.env.DATABASE_URL?.replace(/:[^@]+@/,'://*****@'));
    await pool.query(sql);
    console.log("✅ Migration applied");
  } catch (e) {
    console.error("❌ Migration failed:", e?.message || e);
    console.error(e?.stack || "");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
run();
