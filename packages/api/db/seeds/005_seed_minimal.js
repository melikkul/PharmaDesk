import 'dotenv/config';
import { pool, query } from '../../config/db.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kategoriler
    await client.query(`
      INSERT INTO drug_categories (name)
      VALUES ('Analgesic'), ('Antibiotic'), ('Antipyretic')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Üreticiler
    await client.query(`
      INSERT INTO manufacturers (name, country)
      VALUES ('ACME Pharma','TR'), ('MediCorp','DE'), ('HealthLabs','US')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Depolar
    await client.query(`
      INSERT INTO depots (name)
      VALUES ('Depo A'), ('Depo B')
      ON CONFLICT (name) DO NOTHING;
    `);

    // İlaçlar (kategori + üretici eşle)
    const { rows: cat } = await client.query(`SELECT id,name FROM drug_categories`);
    const { rows: man } = await client.query(`SELECT id,name FROM manufacturers`);
    const catId = (n) => cat.find(x => x.name === n).id;
    const manId = (n) => man.find(x => x.name === n).id;

    await client.query(
      `INSERT INTO drugs (name, category_id, manufacturer_id, dosage, form, image_url, leaflet_url)
       VALUES 
       ($1,$2,$3,'500 mg','tablet',NULL,NULL),
       ($4,$5,$6,'250 mg','capsule',NULL,NULL),
       ($7,$8,$9,'5 mg/ml','syrup',NULL,NULL)
       ON CONFLICT (name) DO NOTHING;`,
      [
        'Paracetamol',  catId('Analgesic'),   manId('ACME Pharma'),
        'Amoxicillin',  catId('Antibiotic'),  manId('MediCorp'),
        'Ibuprofen Syrup', catId('Antipyretic'), manId('HealthLabs')
      ]
    );

    // Depo fiyatları (UPSERT)
    await client.query(`
      INSERT INTO depot_prices (drug_id, depot_id, unit_price, last_updated_at)
      SELECT d.id, dp.id, p.price, NOW()
      FROM (VALUES 
          ('Paracetamol','Depo A', 45.90),
          ('Paracetamol','Depo B', 47.50),
          ('Amoxicillin','Depo A', 78.00),
          ('Ibuprofen Syrup','Depo B', 52.00)
      ) AS p(drug_name,depot_name,price)
      JOIN drugs d   ON d.name = p.drug_name
      JOIN depots dp ON dp.name = p.depot_name
      ON CONFLICT (drug_id,depot_id) DO UPDATE
        SET unit_price = EXCLUDED.unit_price,
            last_updated_at = NOW();
    `);

    // Demo kullanıcı + eczane (yoksa)
    const email = 'demo@pharmacy.local';
    const check = await client.query(`SELECT 1 FROM users WHERE email=$1`, [email]);
    if (check.rowCount === 0) {
      const u = await client.query(
        `INSERT INTO users (email,password_hash,phone,role)
         VALUES ($1, crypt('demo1234', gen_salt('bf')), '5550000000', 'pharmacist')
         RETURNING id`,
        [email]
      );
      const uid = u.rows[0].id;

      const p = await client.query(
        `INSERT INTO pharmacies (user_id,title,gln,service_package)
         VALUES ($1,'Demo Eczanesi','1234567890123','basic')
         RETURNING id`,
        [uid]
      );
      await client.query(
        `INSERT INTO pharmacy_addresses (pharmacy_id,line1,city,district,postal_code)
         VALUES ($1,'Örnek Mah. 1. Cad. No:1','Ankara','Çankaya','06000')`,
        [p.rows[0].id]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Seed minimal completed');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', e);
    process.exit(1);
  } finally {
    client.release();
  }

  const adminEmail = 'admin@pharmadesk.local';
    const checkAdmin = await client.query(`SELECT 1 FROM users WHERE email=$1`, [adminEmail]);
    if (checkAdmin.rowCount === 0) {
      await client.query(
        `INSERT INTO users (email,password_hash,phone,role)
         VALUES ($1, crypt('admin1234', gen_salt('bf')), '0000000000', 'admin')`, // 'admin' rolü
        [adminEmail]
      );
    }

    await client.query('COMMIT');
}

up();
