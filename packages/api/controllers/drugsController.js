import { DrugsService } from "../services/drugsService.js";

export const DrugsController = {
  async list(req, res) {
    try {
      const q = (req.query.q || "").toString().trim();
      const data = await DrugsService.list(q || null);
      res.json({ count: data.length, data });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  },

  async get(req, res) {
    try {
      const item = await DrugsService.get(req.params.id);
      if (!item) return res.status(404).json({ ok: false, error: "Not found" });
      res.json(item);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  },

  async create(req, res) {
    try {
      const item = await DrugsService.create(req.body);
      res.status(201).json(item);
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  },

  async update(req, res) {
    try {
      const item = await DrugsService.update(req.params.id, req.body);
      if (!item) return res.status(404).json({ ok: false, error: "Not found" });
      res.json(item);
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  },

  async remove(req, res) {
    try {
      await DrugsService.remove(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
};
