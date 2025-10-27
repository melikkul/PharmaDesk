import { Router } from "express";
import { DrugsController } from "../controllers/drugsController.js";

const r = Router();

r.get("/", DrugsController.list);
r.get("/:id", DrugsController.get);
r.post("/", DrugsController.create);
r.put("/:id", DrugsController.update);
r.delete("/:id", DrugsController.remove);

export default r;
