import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));

const PORT = process.env.PORT || 8081;

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "pharmadesk-backend", time: new Date().toISOString() });
});

app.get(["/drugs", "/api/drugs"], (req, res) => {
  const DRUGS = [
    { id: 1, name: "Aspirin", form: "tablet" },
    { id: 2, name: "Paracetamol", form: "tablet" },
    { id: 3, name: "Ibuprofen", form: "capsule" },
  ];
  const q = (req.query.q || "").toString().toLowerCase();
  const data = q ? DRUGS.filter(d => d.name.toLowerCase().includes(q)) : DRUGS;
  res.json({ count: data.length, data });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
