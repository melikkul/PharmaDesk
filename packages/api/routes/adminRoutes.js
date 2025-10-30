import { Router } from "express";
import { AdminService } from "../services/adminService.js";

const router = Router();

// /api/admin/pharmacies
router.get("/pharmacies", async (req, res, next) => {
  try {
    const pharmacies = await AdminService.listPharmacies();
    res.json(pharmacies);
  } catch(e) { next(e); }
});

// /api/admin/pharmacies/:id
router.get("/pharmacies/:id", async (req, res, next) => {
  try {
    const details = await AdminService.getPharmacyDetails(req.params.id);
    if (!details) return res.status(404).json({ error: "Pharmacy not found" });
    res.json(details);
  } catch(e) { next(e); }
});

// /api/admin/pharmacies/:id/balance
router.post("/pharmacies/:id/balance", async (req, res, next) => {
  try {
    const adminUserId = req.user.sub; // Middleware'den gelir
    const pharmacyId = req.params.id;
    const updatedPharmacy = await AdminService.adjustPharmacyBalance(pharmacyId, req.body, adminUserId);
    res.json(updatedPharmacy);
  } catch(e) { next(e); }
});

export default router;