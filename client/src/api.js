const KEY = 'crm_token';
export const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* sin storage */ } };

export class ApiError extends Error {
  constructor(message, status, fields) { super(message); this.status = status; this.fields = fields || {}; }
}

async function request(method, url, body) {
  let res;
  try {
    res = await fetch('/api' + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new ApiError('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 0); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/login')) { setToken(null); window.dispatchEvent(new Event('auth:logout')); }
    throw new ApiError(data.error || 'Ocurrió un error inesperado.', res.status, data.fields);
  }
  return data;
}
export const api = {
  get: (u) => request('GET', u), post: (u, b) => request('POST', u, b || {}),
  put: (u, b) => request('PUT', u, b), patch: (u, b) => request('PATCH', u, b), del: (u) => request('DELETE', u),
};
export const qs = (o) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); }); const s = p.toString(); return s ? '?' + s : ''; };
