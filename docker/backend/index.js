import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ping } from "./config/db.js";
import drugsRoutes from "./routes/drugs.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(express.json());
app.use(cors({ origin: [CORS_ORIGIN], credentials: true }));

app.get("/health", async (req, res) => {
  try {
    const db = await ping();
    res.json({ ok: true, service: "pharmadesk-backend", db });
  } catch (e) {
    res.json({ ok: true, service: "pharmadesk-backend", db: { ok: 0, error: e.message } });
  }
});

app.use("/api/drugs", drugsRoutes);

app.use(errorHandler);

app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
