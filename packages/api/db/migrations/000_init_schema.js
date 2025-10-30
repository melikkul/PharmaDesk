// 'import' yerine 'require' kullan
const { pool } = require('../../config/db.js');

const createTables = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'pharmacy', 'warehouse')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    -- ... (diğer tüm tablo CREATE komutları buraya) ...
  `;
  try {
    await pool.query(queryText);
    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables', err.stack);
  } finally {
    await pool.end();
  }
};

createTables();