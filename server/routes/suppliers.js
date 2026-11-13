import { Router } from 'express';
import { db, HttpError, paginate, like } from '../db.js';
import { clean } from '../validate.js';

const r = Router();
const SPEC = {
  company: { label: 'El nombre de la empresa', type: 'string', required: true, max: 160 },
  contact: { label: 'La persona de contacto', type: 'string', max: 120 },
  phone: { label: 'El teléfono', type: 'string', max: 40 },
  email: { label: 'El correo', type: 'email', max: 160 },
  address: { label: 'La dirección', type: 'string', max: 240 },
  category: { label: 'La categoría de suministro', type: 'string', max: 80 },
  notes: { label: 'Las notas', type: 'string', max: 2000 },
};
const base = 'SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) AS product_count FROM suppliers s';

r.get('/', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const where = [], args = [];
  if (req.query.q) { const l = like(req.query.q); where.push("(s.company LIKE ? ESCAPE '\\' OR s.contact LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\')"); args.push(l, l, l); }
  if (req.query.category) { where.push('s.category = ?'); args.push(req.query.category); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM suppliers s ${w}`).get(...args).n;
  const data = db.prepare(`${base} ${w} ORDER BY s.company LIMIT ? OFFSET ?`).all(...args, limit, offset);
  res.json({ data, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
});
r.get('/options', (_req, res) => res.json(db.prepare('SELECT id, company FROM suppliers ORDER BY company').all()));
r.get('/categories', (_req, res) => res.json(db.prepare("SELECT DISTINCT category FROM suppliers WHERE category <> '' ORDER BY category").all().map((x) => x.category)));
r.get('/:id', (req, res) => {
  const s = db.prepare(`${base} WHERE s.id = ?`).get(Number(req.params.id));
  if (!s) throw new HttpError(404, 'No encontramos ese proveedor.');
  res.json({ ...s, products: db.prepare('SELECT id, sku, name, stock, min_stock, price FROM products WHERE supplier_id = ? ORDER BY name').all(s.id) });
});
r.post('/', (req, res) => {
  const d = clean(req.body, SPEC);
  const info = db.prepare('INSERT INTO suppliers (company,contact,phone,email,address,category,notes) VALUES (?,?,?,?,?,?,?)').run(d.company, d.contact, d.phone, d.email, d.address, d.category, d.notes);
  res.status(201).json(db.prepare(`${base} WHERE s.id = ?`).get(info.lastInsertRowid));
});
r.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(id)) throw new HttpError(404, 'No encontramos ese proveedor.');
  const d = clean(req.body, SPEC);
  db.prepare('UPDATE suppliers SET company=?, contact=?, phone=?, email=?, address=?, category=?, notes=? WHERE id=?').run(d.company, d.contact, d.phone, d.email, d.address, d.category, d.notes, id);
  res.json(db.prepare(`${base} WHERE s.id = ?`).get(id));
});
r.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(id)) throw new HttpError(404, 'No encontramos ese proveedor.');
  const n = db.prepare('SELECT COUNT(*) AS n FROM products WHERE supplier_id = ?').get(id).n;
  if (n) throw new HttpError(409, `Este proveedor tiene ${n} producto${n === 1 ? '' : 's'} vinculado${n === 1 ? '' : 's'}. Cámbialos de proveedor antes de eliminarlo.`);
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  res.json({ ok: true });
});
export default r;
