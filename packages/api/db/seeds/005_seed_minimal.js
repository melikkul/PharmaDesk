// 'import' yerine 'require' kullan
const { pool } = require('../../config/db.js');
const bcrypt = require('bcrypt');

const seedDatabase = async () => {
  try {
    const adminPasswordHash = await bcrypt.hash('admin1234', 10);
    const adminInsert = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('admin', 'admin@pharmadesk.local', $1, 'admin')
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `;
    const adminRes = await pool.query(adminInsert, [adminPasswordHash]);
    console.log('Admin user seeded');

    const demoPasswordHash = await bcrypt.hash('demo1234', 10);
    const demoInsert = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('demo_pharmacy', 'demo@pharmacy.local', $1, 'pharmacy')
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `;
    const demoRes = await pool.query(demoInsert, [demoPasswordHash]);
    console.log('Demo pharmacy user seeded');

  } catch (err) {
    console.error('Error seeding database', err.stack);
  } finally {
    await pool.end();
  }
};

seedDatabase();