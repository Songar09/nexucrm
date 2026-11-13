import { Router } from 'express';
import { db, getSettings } from '../db.js';
import { requireAdmin } from '../auth.js';
import { clean } from '../validate.js';

const r = Router();
const SPEC = {
  company_name: { label: 'El nombre de la empresa', type: 'string', required: true, max: 120 },
  tax_id: { label: 'El NIT', type: 'string', max: 40 },
  address: { label: 'La dirección', type: 'string', max: 200 },
  tax_rate: { label: 'El IVA', type: 'number', required: true, min: 0, max: 1 },
};
r.get('/', (_req, res) => res.json(getSettings()));
r.put('/', requireAdmin, (req, res) => {
  const d = clean({ ...req.body, tax_rate: Number(req.body?.tax_rate) / 100 }, SPEC);
  const up = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const [k, v] of Object.entries(d)) up.run(k, String(v));
  res.json(getSettings());
});
export default r;
