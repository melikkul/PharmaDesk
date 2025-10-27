import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken';

export async function login(email, password){
  const { rows } = await pool.query(
    `SELECT id, email, role FROM users WHERE email=$1 AND password_hash = crypt($2, password_hash)`,
    [email, password]
  );
  if (!rows[0]) throw new Error('Invalid credentials');

  const user = rows[0];

  const ph = await pool.query(
    `SELECT p.id, p.title, p.gln, a.city, a.district
     FROM pharmacies p
     LEFT JOIN pharmacy_addresses a ON a.pharmacy_id=p.id
     WHERE p.user_id=$1
     LIMIT 1`, [user.id]
  );

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '12h' });

  return { token, user, pharmacy: ph.rows[0] || null };
}
