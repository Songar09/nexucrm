import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, HttpError, paginate, like } from '../db.js';
import { publicUser } from '../auth.js';
import { clean } from '../validate.js';

const r = Router();
const SPEC = {
  name: { label: 'El nombre', type: 'string', required: true, max: 120 },
  email: { label: 'El correo', type: 'email', required: true, max: 160 },
  role: { label: 'El rol', type: 'enum', values: ['admin', 'employee'], required: true },
  position: { label: 'El cargo', type: 'string', max: 120 },
  active: { label: 'El estado', type: 'bool', default: true },
};
const checkPassword = (p, required) => {
  if (!p && !required) return null;
  if (String(p || '').length < 8) throw new HttpError(422, 'Revisa los datos del formulario.', { password: 'La contraseña debe tener al menos 8 caracteres.' });
  return bcrypt.hashSync(String(p), 10);
};
const withMetrics = `
  SELECT u.*, 
    (SELECT COUNT(*) FROM sales s WHERE s.user_id = u.id AND s.status = 'completed') AS sales_count,
    (SELECT COALESCE(SUM(total),0) FROM sales s WHERE s.user_id = u.id AND s.status = 'completed') AS sales_total
  FROM users u`;
const shape = (u) => ({ ...publicUser(u), created_at: u.created_at, sales_count: u.sales_count, sales_total: u.sales_total });

r.get('/', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const where = [], args = [];
  if (req.query.q) { where.push("(u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.position LIKE ? ESCAPE '\\')"); const l = like(req.query.q); args.push(l, l, l); }
  if (req.query.role) { where.push('u.role = ?'); args.push(req.query.role); }
  if (req.query.active === '1' || req.query.active === '0') { where.push('u.active = ?'); args.push(Number(req.query.active)); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users u ${w}`).get(...args).n;
  const rows = db.prepare(`${withMetrics} ${w} ORDER BY u.active DESC, u.name LIMIT ? OFFSET ?`).all(...args, limit, offset);
  res.json({ data: rows.map(shape), page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
});

r.post('/', (req, res) => {
  const d = clean(req.body, SPEC);
  const hash = checkPassword(req.body.password, true);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(d.email)) throw new HttpError(409, 'Ya existe un usuario con ese correo.', { email: 'Ya existe un usuario con ese correo.' });
  const info = db.prepare('INSERT INTO users (name,email,password_hash,role,position,active) VALUES (?,?,?,?,?,?)').run(d.name, d.email, hash, d.role, d.position, d.active ? 1 : 0);
  res.status(201).json(shape(db.prepare(`${withMetrics} WHERE u.id = ?`).get(info.lastInsertRowid)));
});

r.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!cur) throw new HttpError(404, 'No encontramos ese usuario.');
  const d = clean(req.body, SPEC);
  const hash = checkPassword(req.body.password, false);
  if (db.prepare('SELECT 1 FROM users WHERE email = ? AND id <> ?').get(d.email, id)) throw new HttpError(409, 'Ya existe un usuario con ese correo.', { email: 'Ya existe un usuario con ese correo.' });
  if (id === req.user.id && (d.role !== 'admin' || !d.active)) throw new HttpError(422, 'No puedes quitarte el rol de administrador ni desactivarte a ti mismo.');
  if (cur.role === 'admin' && (d.role !== 'admin' || !d.active)) {
    const others = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1 AND id <> ?").get(id).n;
    if (!others) throw new HttpError(422, 'Debe quedar al menos un administrador activo.');
  }
  db.prepare('UPDATE users SET name=?, email=?, role=?, position=?, active=?, password_hash=COALESCE(?, password_hash) WHERE id=?').run(d.name, d.email, d.role, d.position, d.active ? 1 : 0, hash, id);
  res.json(shape(db.prepare(`${withMetrics} WHERE u.id = ?`).get(id)));
});

r.patch('/:id/active', (req, res) => {
  const id = Number(req.params.id), active = req.body?.active ? 1 : 0;
  const cur = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!cur) throw new HttpError(404, 'No encontramos ese usuario.');
  if (id === req.user.id) throw new HttpError(422, 'No puedes desactivarte a ti mismo.');
  if (!active && cur.role === 'admin') {
    const others = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1 AND id <> ?").get(id).n;
    if (!others) throw new HttpError(422, 'Debe quedar al menos un administrador activo.');
  }
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, id);
  res.json(shape(db.prepare(`${withMetrics} WHERE u.id = ?`).get(id)));
});

r.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!cur) throw new HttpError(404, 'No encontramos ese usuario.');
  if (id === req.user.id) throw new HttpError(422, 'No puedes eliminar tu propia cuenta.');
  if (db.prepare('SELECT 1 FROM sales WHERE user_id = ?').get(id)) throw new HttpError(409, 'Este usuario tiene ventas registradas. Desactívalo en lugar de eliminarlo para conservar el historial.');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default r;
