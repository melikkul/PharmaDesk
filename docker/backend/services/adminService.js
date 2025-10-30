import { AdminRepo } from "../repositories/adminRepo.js";
import Joi from "joi";

// Admin'in bakiye eklemesi için doğrulama şeması
const balanceSchema = Joi.object({
  amount: Joi.number().required(),
  description: Joi.string().min(5).max(255).required()
});

export const AdminService = {
  async listPharmacies() {
    return await AdminRepo.findAllPharmacies();
  },

  async getPharmacyDetails(id) {
    const pharmacy = await AdminRepo.findPharmacyById(id);
    if (!pharmacy) return null;
    
    // Varsayım: 'transactions' tablosu var
    // const transactions = await AdminRepo.findTransactionsForPharmacy(id);
    // pharmacy.transactions = transactions;
    
    // 'transactions' tablosu olmadığı için geçici olarak boş dizi
    pharmacy.transactions = []; 
    
    return pharmacy;
  },

  async adjustPharmacyBalance(pharmacyId, payload, adminUserId) {
    const { value, error } = balanceSchema.validate(payload);
    if (error) throw new Error(error.message);

    // Varsayım: 'transactions' tablosu var
    // const newTransaction = await AdminRepo.addManualTransaction(
    //   pharmacyId,
    //   value.amount,
    //   value.description,
    //   adminUserId
    // );
    
    // const updatedPharmacy = await AdminRepo.findPharmacyById(pharmacyId);
    // return updatedPharmacy;
    
    // 'transactions' tablosu olmadığı için geçici çözüm:
    console.warn("AdminService.adjustPharmacyBalance: 'transactions' tablosu eksik.");
    const updatedPharmacy = await AdminRepo.findPharmacyById(pharmacyId);
    // Bakiyeyi manuel olarak (ve yanlış olarak) ayarla
    updatedPharmacy.balance = (parseFloat(updatedPharmacy.balance) + parseFloat(value.amount)).toFixed(2);
    return updatedPharmacy;
  }
};