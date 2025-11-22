# Docker Deployment Test

## Test Adımları

1. **Docker Container'ları Durdur ve Temizle:**
   ```bash
   cd /home/melik/PharmaDesk-main
   docker compose down -v
   ```

2. **Yeniden Build Et ve Başlat:**
   ```bash
   docker compose up --build
   ```

3. **Migration Loglarını Kontrol Et:**
   Backend container loglarında şu mesajları göreceksiniz:
   - "Applying database migrations..."
   - "AppDbContext migrations applied successfully."
   - "IdentityDbContext migrations applied successfully."

4. **Veritabanı Tablolarını Kontrol Et:**
   ```bash
   docker exec -it pharma_desk_db psql -U pharmadesk_user -d pharmadesk_db
   ```
   
   PostgreSQL içinde:
   ```sql
   \dt
   -- Yeni tabloları görmeli: Offers, Transactions, Shipments, Notifications, Messages
   
   \d "PharmacyProfiles"
   -- Yeni kolonları görmeli: Balance, CoverImageUrl, Username, RegistrationDate
   
   \d "InventoryItems"
   -- Yeni kolonları görmeli: CostPrice, SalePrice, BonusQuantity
   ```

## Beklenen Sonuç

✅ Tüm migration'lar otomatik uygulanacak
✅ 5 yeni tablo oluşacak
✅ Mevcut tablolara yeni kolonlar eklenecek
✅ Backend API çalışmaya başlayacak
✅ Frontend'ler backend'e bağlanabilecek
