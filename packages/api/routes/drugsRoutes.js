import { Router } from "express";
import * as svc from "../services/drugsService.js";

const router = Router();

router.get("/", async (req,res,next)=>{
  try { res.json(await svc.list()); }
  catch(e){ next(e); }
});

export default router;
