import Joi from "joi";
import { DrugsRepo } from "../repositories/drugsRepo.js";
import { Drug } from "../models/drug.js";

const createSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  form: Joi.string().allow(null, ""),
  strength: Joi.string().allow(null, ""),
  price: Joi.number().min(0).default(0)
});

export const DrugsService = {
  async list(q) {
    const rows = q ? await DrugsRepo.searchByName(q) : await DrugsRepo.findAll();
    return rows.map(r => new Drug(r));
  },

  async get(id) {
    const row = await DrugsRepo.findById(Number(id));
    return row ? new Drug(row) : null;
  },

  async create(payload) {
    const { value, error } = createSchema.validate(payload);
    if (error) throw new Error(error.message);
    
    // Optimizasyon: Repo artık tam nesneyi döndürüyor, 'get' çağrısına gerek yok.
    const newItem = await DrugsRepo.create(value);
    return new Drug(newItem);
  },

  async update(id, payload) {
    const { value, error } = createSchema.fork(["name"], (s)=>s.optional()).validate(payload);
    if (error) throw new Error(error.message);
    const updated = await DrugsRepo.update(Number(id), value);
    return updated ? new Drug(updated) : null;
  },

  async remove(id) {
    await DrugsRepo.remove(Number(id));
    return true;
  }
};