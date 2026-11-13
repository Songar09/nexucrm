const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CO');
export const money = (v) => cop.format(Math.round(Number(v) || 0));
export const int = (v) => num.format(Number(v) || 0);
export const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`;
/** 1.250.000 → "$1,3 M"; para ejes y etiquetas de gráficas */
export function compact(v) {
  const n = Number(v) || 0, a = Math.abs(n);
  const f = (x, s) => `$${(x).toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${s}`;
  if (a >= 1e9) return f(n / 1e9, 'MM');
  if (a >= 1e6) return f(n / 1e6, 'M');
  if (a >= 1e3) return f(n / 1e3, 'mil');
  return `$${Math.round(n)}`;
}
const TZ = 'America/Bogota';
export const dateTime = (iso) => iso ? new Date(iso).toLocaleString('es-CO', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
export const dateOnly = (iso) => iso ? new Date(iso).toLocaleDateString('es-CO', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }) : '';
export const shortDay = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }); };
export const monthName = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''); };
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export const ROLE = { admin: 'Administrador', employee: 'Empleado' };
export const CUSTOMER_STATUS = { prospect: 'Prospecto', active: 'Activo', inactive: 'Inactivo' };
