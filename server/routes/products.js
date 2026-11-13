import { Router } from 'express';
import { db, HttpError, paginate, like } from '../db.js';
import { clean } from '../validate.js';

const r = Router();
const SPEC = {
  sku: { label: 'El código SKU', type: 'string', required: true, max: 40 },
  name: { label: 'El nombre', type: 'string', required: true, max: 160 },
  description: { label: 'La descripción', type: 'string', max: 1000 },
  category: { label: 'La categoría', type: 'string', max: 80 },
  cost: { label: 'El precio de costo', type: 'number', min: 0, max: 1e12 },
  price: { label: 'El precio de venta', type: 'number', required: true, min: 0, max: 1e12 },
  stock: { label: 'El stock actual', type: 'int', min: 0, max: 1e9 },
  min_stock: { label: 'El stock mínimo', type: 'int', min: 0, max: 1e9 },
  supplier_id: { label: 'El proveedor', type: 'int', nullable: true },
};
const base = 'SELECT p.*, s.company AS supplier_name FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id';
const checkSupplier = (id) => { if (id && !db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(id)) throw new HttpError(422, 'Revisa los datos del formulario.', { supplier_id: 'Ese proveedor no existe.' }); };

r.get('/', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const where = [], args = [];
  if (req.query.q) { const l = like(req.query.q); where.push("(p.name LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')"); args.push(l, l, l); }
  if (req.query.category) { where.push('p.category = ?'); args.push(req.query.category); }
  if (req.query.supplier_id) { where.push('p.supplier_id = ?'); args.push(Number(req.query.supplier_id)); }
  if (req.query.stock === 'low') where.push('p.stock <= p.min_stock');
  if (req.query.stock === 'out') where.push('p.stock = 0');
  if (req.query.stock === 'ok') where.push('p.stock > p.min_stock');
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM products p ${w}`).get(...args).n;
  const data = db.prepare(`${base} ${w} ORDER BY p.name LIMIT ? OFFSET ?`).all(...args, limit, offset);
  res.json({ data, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
});
r.get('/categories', (_req, res) => res.json(db.prepare("SELECT DISTINCT category FROM products WHERE category <> '' ORDER BY category").all().map((x) => x.category)));
r.get('/search', (req, res) => {
  const l = like(req.query.q);
  res.json(db.prepare("SELECT id, sku, name, price, stock FROM products WHERE (name LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\') ORDER BY (stock = 0), name LIMIT 12").all(l, l));
});
r.get('/:id', (req, res) => {
  const p = db.prepare(`${base} WHERE p.id = ?`).get(Number(req.params.id));
  if (!p) throw new HttpError(404, 'No encontramos ese producto.');
  res.json(p);
});
r.post('/', (req, res) => {
  const d = clean(req.body, SPEC); checkSupplier(d.supplier_id);
  if (db.prepare('SELECT 1 FROM products WHERE sku = ?').get(d.sku)) throw new HttpError(409, 'Ya existe un producto con ese SKU.', { sku: 'Ya existe un producto con ese SKU.' });
  const info = db.prepare('INSERT INTO products (sku,name,description,category,cost,price,stock,min_stock,supplier_id) VALUES (?,?,?,?,?,?,?,?,?)').run(d.sku, d.name, d.description, d.category, d.cost, d.price, d.stock, d.min_stock, d.supplier_id);
  res.status(201).json(db.prepare(`${base} WHERE p.id = ?`).get(info.lastInsertRowid));
});
r.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM products WHERE id = ?').get(id)) throw new HttpError(404, 'No encontramos ese producto.');
  const d = clean(req.body, SPEC); checkSupplier(d.supplier_id);
  if (db.prepare('SELECT 1 FROM products WHERE sku = ? AND id <> ?').get(d.sku, id)) throw new HttpError(409, 'Ya existe un producto con ese SKU.', { sku: 'Ya existe un producto con ese SKU.' });
  db.prepare('UPDATE products SET sku=?, name=?, description=?, category=?, cost=?, price=?, stock=?, min_stock=?, supplier_id=? WHERE id=?').run(d.sku, d.name, d.description, d.category, d.cost, d.price, d.stock, d.min_stock, d.supplier_id, id);
  res.json(db.prepare(`${base} WHERE p.id = ?`).get(id));
});
r.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM products WHERE id = ?').get(id)) throw new HttpError(404, 'No encontramos ese producto.');
  db.prepare('DELETE FROM products WHERE id = ?').run(id);  // el historial de ventas conserva nombre y SKU
  res.json({ ok: true });
});
export default r;
