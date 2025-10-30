import { pool } from "../config/db.js";

export const DrugsRepo = {
  async findAll(limit = 50) {
    const sql = `SELECT id, name, form, strength, price FROM drugs ORDER BY name LIMIT $1`;
    const r = await pool.query(sql, [limit]);
    return r.rows;
  },

  async searchByName(q, limit = 50) {
    const sql = `SELECT id, name, form, strength, price FROM drugs WHERE name ILIKE $1 ORDER BY name LIMIT $2`;
    const r = await pool.query(sql, ['%' + q + '%', limit]);
    return r.rows;
  },

  async findById(id) {
    const r = await pool.query(`SELECT id, name, form, strength, price FROM drugs WHERE id = $1`, [id]);
    return r.rows[0] || null;
  },

  async create({ name, form, strength, price }) {
    // Optimizasyon: Sadece 'id' yerine tüm yeni satırı döndür
    const sql = `INSERT INTO drugs(name, form, strength, price) VALUES($1,$2,$3,$4) RETURNING *`;
    const r = await pool.query(sql, [name, form, strength, price]);
    return r.rows[0]; // Tam nesneyi döndür
  },

  async update(id, { name, form, strength, price }) {
    const sql = `UPDATE drugs SET name=COALESCE($2,name), form=COALESCE($3,form),
                 strength=COALESCE($4,strength), price=COALESCE($5,price) WHERE id=$1 RETURNING *`;
    const r = await pool.query(sql, [id, name, form, strength, price]);
    return r.rows[0] || null;
  },

  async remove(id) {
    await pool.query(`DELETE FROM drugs WHERE id=$1`, [id]);
    return true;
  }
};