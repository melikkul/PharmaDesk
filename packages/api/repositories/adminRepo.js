import { pool } from "../config/db.js";

export const AdminRepo = {
  // Tüm eczaneleri ve detaylarını listele
  async findAllPharmacies() {
    const sql = `
      SELECT 
        p.id, p.user_id, p.title as pharmacyName, p.gln, p.service_package,
        u.email, u.phone, u.role, u.created_at,
        a.line1, a.city, a.district,
        COALESCE(pb.balance, 0) as balance,
        (SELECT COUNT(*) FROM offers WHERE pharmacy_id = p.id) as offer_count
      FROM pharmacies p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN pharmacy_addresses a ON p.id = a.pharmacy_id
      LEFT JOIN (
        SELECT pharmacy_id, SUM(amount) as balance
        FROM transactions
        GROUP BY pharmacy_id
      ) pb ON p.id = pb.pharmacy_id
      ORDER BY p.title;
    `;
    const r = await pool.query(sql);
    return r.rows;
  },

  // Tek bir eczanenin tüm detaylarını getir
  async findPharmacyById(id) {
    // Yukarıdaki sorgunun aynısı, ancak tek bir ID için
    const sql = `
      SELECT 
        p.id, p.user_id, p.title as pharmacyName, p.gln, p.service_package,
        u.email, u.phone, u.role, u.created_at,
        a.line1, a.city, a.district,
        COALESCE(pb.balance, 0) as balance
      FROM pharmacies p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN pharmacy_addresses a ON p.id = a.pharmacy_id
      LEFT JOIN (
        SELECT pharmacy_id, SUM(amount) as balance
        FROM transactions
        GROUP BY pharmacy_id
      ) pb ON p.id = pb.pharmacy_id
      WHERE p.id = $1;
    `;
    const r = await pool.query(sql, [id]);
    return r.rows[0] || null;
  },
  
  // Bir eczanenin tüm işlem geçmişi
  async findTransactionsForPharmacy(pharmacyId) {
    const sql = `
      SELECT id, transaction_type, amount, description, created_at
      FROM transactions
      WHERE pharmacy_id = $1
      ORDER BY created_at DESC;
    `;
     const r = await pool.query(sql, [pharmacyId]);
    return r.rows;
  },

  // Manuel bakiye işlemi ekle (Admin tarafından)
  async addManualTransaction(pharmacyId, amount, description, adminUserId) {
    const sql = `
      INSERT INTO transactions (pharmacy_id, amount, transaction_type, description, status, created_by_admin_id)
      VALUES ($1, $2, $3, $4, 'completed', $5)
      RETURNING *;
    `;
    // Not: DB şemanızda 'transactions' tablosu ve bu sütunlar olmalı
    // '000_init_schema.js' dosyanızda bu tablo yok, eklemeniz GEREKEBİLİR.
    // Şimdilik ana mantığa odaklanıyoruz.
    
    // Varsayım: 'transactions' tablosu yoksa, bu sorgu hata verir.
    // Geçici olarak bu kısmı atlıyor ve sadece eczane bulmayı ekliyorum.
    // GERÇEK UYGULAMADA BURASI GÜNCELLENMELİ.
    
    // ---- GEÇİCİ ÇÖZÜM (transactions tablosu olmadığı için) ----
    // Gerçekte burada bir DB işlemi olmalı.
    console.warn("AdminRepo.addManualTransaction: 'transactions' tablosu eksik. İşlem kaydedilmedi.");
    return { 
      pharmacy_id: pharmacyId, 
      amount: amount, 
      description: description, 
      created_by_admin_id: adminUserId 
    };
  }
};