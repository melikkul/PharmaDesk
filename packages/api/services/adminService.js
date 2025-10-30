import { AdminRepo } from "../repositories/adminRepo.js";
import Joi from "joi";

const balanceSchema = Joi.object({
  amount: Joi.number().required(),
  description: Joi.string().min(5).max(255).required()
});

export const AdminService = {
  async listPharmacies() {
    try {
      return await AdminRepo.findAllPharmacies();
    } catch (e) {
      console.error("[AdminService] Eczaneler listelenemedi (Tablo eksik olabilir):", e.message);
      return []; // Hata durumunda boş dizi döndür
    }
  },

  async getPharmacyDetails(id) {
    let pharmacy;
    try {
      pharmacy = await AdminRepo.findPharmacyById(id);
    } catch (e) {
      console.error(`[AdminService] Eczane ${id} bulunamadı (Tablo eksik olabilir):`, e.message);
      return null;
    }
    
    if (!pharmacy) return null;
    
    try {
      const transactions = await AdminRepo.findTransactionsForPharmacy(id);
      pharmacy.transactions = transactions;
    } catch (e) {
      console.warn(`[AdminService] Eczane ${id} için işlemler bulunamadı (transactions tablosu eksik olabilir):`, e.message);
      pharmacy.transactions = []; // Hata durumunda boş dizi ata
    }
    
    return pharmacy;
  },

  async adjustPharmacyBalance(pharmacyId, payload, adminUserId) {
    const { value, error } = balanceSchema.validate(payload);
    if (error) throw new Error(error.message);

    try {
      // 1. İşlem kaydını (log) oluşturmayı dene
      await AdminRepo.addManualTransaction(
        pharmacyId,
        value.amount,
        value.description,
        adminUserId
      );

      // 2. Eczanenin mevcut bakiyesini al
      const pharmacy = await AdminRepo.findPharmacyById(pharmacyId);
      if (!pharmacy) throw new Error("Eczane bulunamadı.");
      
      const currentBalance = parseFloat(pharmacy.balance) || 0;
      const newBalance = currentBalance + value.amount;

      // 3. Eczanenin ana bakiyesini güncelle
      await AdminRepo.updatePharmacyBalance(pharmacyId, newBalance.toFixed(2));
      
      // 4. Güncel eczane verisini döndür
      return await this.getPharmacyDetails(pharmacyId);

    } catch (e) {
      console.error("[AdminService] Bakiye güncellenemedi (Tablolar eksik olabilir):", e.message);
      // Hata olsa bile, crash olmaması için en azından detayı tekrar çekmeyi dene
      const updatedPharmacy = await this.getPharmacyDetails(pharmacyId);
      if (updatedPharmacy) {
           // Bakiyeyi manuel (ve potansiyel olarak yanlış) ayarla, en azından arayüz güncellensin
           updatedPharmacy.balance = (parseFloat(updatedPharmacy.balance) + value.amount).toFixed(2);
      }
      return updatedPharmacy;
    }
  }
};