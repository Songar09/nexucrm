import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { db, HttpError } from './db.js';

let secret = process.env.JWT_SECRET;
if (!secret) {
  secret = randomBytes(32).toString('hex');
  console.warn('[aviso] JWT_SECRET no está definido: se generó uno temporal. Las sesiones se cerrarán al reiniciar el servidor.');
}
const EXPIRES = process.env.JWT_EXPIRES || '7d';

export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: EXPIRES });

export function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, position: u.position, active: !!u.active };
}

export function requireAuth(req, _res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) throw new HttpError(401, 'Inicia sesión para continuar.');
    let payload;
    try { payload = jwt.verify(token, secret); } catch { throw new HttpError(401, 'Tu sesión expiró. Inicia sesión de nuevo.'); }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.active) throw new HttpError(401, 'Tu usuario no está activo. Habla con un administrador.');
    req.user = user;
    next();
  } catch (e) { next(e); }
}

export function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') return next(new HttpError(403, 'Solo un administrador puede hacer esto.'));
  next();
}
