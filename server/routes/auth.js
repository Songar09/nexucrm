import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { db, HttpError } from '../db.js';
import { signToken, publicUser, requireAuth } from '../auth.js';

const r = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' } });

r.post('/login', limiter, (req, res) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  if (!email || !password) throw new HttpError(422, 'Escribe tu correo y tu contraseña.');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  // misma respuesta para correo inexistente y contraseña errónea
  const ok = user && bcrypt.compareSync(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Correo o contraseña incorrectos.');
  if (!user.active) throw new HttpError(403, 'Tu usuario está desactivado. Habla con un administrador.');
  res.json({ token: signToken(user), user: publicUser(user) });
});

r.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

r.post('/change-password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  if (!bcrypt.compareSync(String(current || ''), req.user.password_hash)) throw new HttpError(422, 'La contraseña actual no es correcta.', { current: 'La contraseña actual no es correcta.' });
  if (String(next || '').length < 8) throw new HttpError(422, 'La contraseña nueva debe tener al menos 8 caracteres.', { next: 'Mínimo 8 caracteres.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(next), 10), req.user.id);
  res.json({ ok: true });
});

export default r;
