import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ping } from "./config/db.js";
import drugsRoutes from "./routes/drugsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

// YENİ İMPORTLAR
import { adminAuth } from "./middlewares/adminAuth.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Admin paneli için CORS origin'i ekleyin (örneğin admin.localhost:3001)
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || "http://localhost:3001";
app.use(express.json());
app.use(cors({ origin: [CORS_ORIGIN, ADMIN_ORIGIN], credentials: true })); // ADMIN_ORIGIN eklendi

app.get("/health", async (_req, res) => {
  try { const db = await ping(); res.json({ ok: true, service: "pharmadesk-backend", db }); }
  catch (e) { res.json({ ok: true, service: "pharmadesk-backend", db: { ok: 0, error: e.message } }); }
});

// Standart Rotalar
app.use("/api/drugs", drugsRoutes);
app.use("/api/auth", authRoutes);

// YENİ ADMIN ROTALARI
// /api/admin ile başlayan tüm rotalar önce adminAuth middleware'inden geçecek
app.use("/api/admin", adminAuth, adminRoutes);


app.use(errorHandler);

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));