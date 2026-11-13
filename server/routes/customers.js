import { Router } from 'express';
import { db, HttpError, paginate, like, localExpr } from '../db.js';
import { clean } from '../validate.js';

const r = Router();
const SPEC = {
  name: { label: 'El nombre o razón social', type: 'string', required: true, max: 160 },
  tax_id: { label: 'El documento', type: 'string', max: 40 },
  email: { label: 'El correo', type: 'email', max: 160 },
  phone: { label: 'El teléfono', type: 'string', max: 40 },
  address: { label: 'La dirección', type: 'string', max: 240 },
  status: { label: 'El estado', type: 'enum', values: ['prospect', 'active', 'inactive'], default: 'prospect' },
  notes: { label: 'Las notas', type: 'string', max: 2000 },
};
const base = `SELECT c.*,
  (SELECT COALESCE(SUM(total),0) FROM sales s WHERE s.customer_id = c.id AND s.status='completed') AS total_spent,
  (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status='completed') AS purchases
  FROM customers c`;

r.get('/', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const where = [], args = [];
  if (req.query.q) { const l = like(req.query.q); where.push("(c.name LIKE ? ESCAPE '\\' OR c.tax_id LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\')"); args.push(l, l, l, l); }
  if (req.query.status) { where.push('c.status = ?'); args.push(req.query.status); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM customers c ${w}`).get(...args).n;
  const data = db.prepare(`${base} ${w} ORDER BY c.created_at DESC, c.id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
  res.json({ data, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
});

r.get('/options', (_req, res) => {
  res.json(db.prepare("SELECT id, name, tax_id FROM customers WHERE status <> 'inactive' ORDER BY name").all());
});

r.get('/:id', (req, res) => {
  const c = db.prepare(`${base} WHERE c.id = ?`).get(Number(req.params.id));
  if (!c) throw new HttpError(404, 'No encontramos ese cliente.');
  const sales = db.prepare(`SELECT s.id, s.total, s.status, s.created_at, u.name AS employee,
      (SELECT GROUP_CONCAT(name || ' x' || qty, ', ') FROM sale_items WHERE sale_id = s.id) AS items
      FROM sales s LEFT JOIN users u ON u.id = s.user_id WHERE s.customer_id = ? ORDER BY s.created_at DESC`).all(c.id);
  res.json({ ...c, sales });
});

r.post('/', (req, res) => {
  const d = clean(req.body, SPEC);
  const info = db.prepare('INSERT INTO customers (name,tax_id,email,phone,address,status,notes) VALUES (?,?,?,?,?,?,?)').run(d.name, d.tax_id, d.email, d.phone, d.address, d.status, d.notes);
  res.status(201).json(db.prepare(`${base} WHERE c.id = ?`).get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM customers WHERE id = ?').get(id)) throw new HttpError(404, 'No encontramos ese cliente.');
  const d = clean(req.body, SPEC);
  db.prepare('UPDATE customers SET name=?, tax_id=?, email=?, phone=?, address=?, status=?, notes=? WHERE id=?').run(d.name, d.tax_id, d.email, d.phone, d.address, d.status, d.notes, id);
  res.json(db.prepare(`${base} WHERE c.id = ?`).get(id));
});

r.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM customers WHERE id = ?').get(id)) throw new HttpError(404, 'No encontramos ese cliente.');
  if (db.prepare('SELECT 1 FROM sales WHERE customer_id = ?').get(id)) throw new HttpError(409, 'Este cliente tiene ventas registradas. Márcalo como inactivo para conservar el historial.');
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default r;
