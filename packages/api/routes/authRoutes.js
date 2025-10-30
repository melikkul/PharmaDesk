import { Router } from "express";
import * as svc from "../services/authService.js";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const out = await svc.login(email, password);
    res.json(out);
  } catch (e) { next(e); }
});

export default router;
