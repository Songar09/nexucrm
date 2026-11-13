import { HttpError } from './db.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** spec: { campo: { label, type: 'string'|'number'|'int'|'enum'|'email'|'bool', required, max, min, values, nullable } } */
export function clean(body = {}, spec, { partial = false } = {}) {
  const out = {}, fields = {};
  for (const [k, s] of Object.entries(spec)) {
    let v = body[k];
    const label = s.label || k;
    const empty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    if (empty) {
      if (partial && v === undefined) continue;
      if (s.required) { fields[k] = `${label} es obligatorio.`; continue; }
      out[k] = s.type === 'number' || s.type === 'int' ? (s.nullable ? null : s.default ?? 0) : s.type === 'bool' ? !!s.default : s.nullable ? null : s.default ?? '';
      continue;
    }
    switch (s.type) {
      case 'string': case 'email': {
        v = String(v).trim();
        if (v.length > (s.max || 300)) { fields[k] = `${label} es demasiado largo.`; break; }
        if (s.type === 'email' && !EMAIL.test(v)) { fields[k] = `${label} no es un correo válido.`; break; }
        out[k] = v; break;
      }
      case 'number': case 'int': {
        const n = Number(v);
        if (!Number.isFinite(n)) { fields[k] = `${label} debe ser un número.`; break; }
        if (s.type === 'int' && !Number.isInteger(n)) { fields[k] = `${label} debe ser un número entero.`; break; }
        if (s.min !== undefined && n < s.min) { fields[k] = `${label} no puede ser menor que ${s.min}.`; break; }
        if (s.max !== undefined && n > s.max) { fields[k] = `${label} no puede ser mayor que ${s.max}.`; break; }
        out[k] = n; break;
      }
      case 'enum':
        if (!s.values.includes(v)) { fields[k] = `${label} no es válido.`; break; }
        out[k] = v; break;
      case 'bool': out[k] = v === true || v === 1 || v === '1' || v === 'true'; break;
      default: out[k] = v;
    }
  }
  if (Object.keys(fields).length) throw new HttpError(422, 'Revisa los datos del formulario.', fields);
  return out;
}
