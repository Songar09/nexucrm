import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import './db.js';
import { seedIfEmpty } from './seed.js';
import { requireAuth, requireAdmin } from './auth.js';
import { HttpError, db } from './db.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import customersRoutes from './routes/customers.js';
import productsRoutes from './routes/products.js';
import suppliersRoutes from './routes/suppliers.js';
import salesRoutes from './routes/sales.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import chatRoutes from './chat.js';

const app = express();
app.set('trust proxy', 1);                       // detrás del proxy de Render/Railway/etc.
app.use(helmet({ contentSecurityPolicy: false })); // el front es una SPA propia; CSP la define el hosting si hace falta
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ ok: true }); });
app.use('/api/auth', authRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/customers', requireAuth, customersRoutes);
app.use('/api/products', requireAuth, productsRoutes);
app.use('/api/suppliers', requireAuth, suppliersRoutes);
app.use('/api/sales', requireAuth, salesRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/users', requireAuth, requireAdmin, usersRoutes);   // módulo de empleados: solo administrador
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada.')));

// Front compilado (npm run build) + fallback de la SPA
const dist = join(import.meta.dirname, '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Ocurrió un error inesperado. Inténtalo de nuevo.' : err.message, fields: err.fields });
});

if (seedIfEmpty()) console.log('Base de datos inicial creada. Usuario: admin@crm.com');
const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`CRM listo en http://localhost:${port}`));
