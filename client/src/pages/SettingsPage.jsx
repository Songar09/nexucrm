import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Field, PageHeader, Badge, Spinner, useToast } from '../ui.jsx';
import { ROLE } from '../format.js';

function Company() {
  const toast = useToast();
  const [f, setF] = useState(null); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/settings').then((s) => setF({ company_name: s.company_name, tax_id: s.tax_id, address: s.address, tax_rate: String(Math.round(s.tax_rate * 10000) / 100) })); }, []);
  if (!f) return <div className="card flex justify-center p-10"><Spinner className="h-6 w-6" /></div>;
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })); };
  async function save(e) {
    e.preventDefault(); setBusy(true); setErr({});
    try { await api.put('/settings', f); toast.ok('Datos de la empresa guardados.'); } catch (x) { setErr(x.fields || {}); if (!Object.keys(x.fields || {}).length) toast.error(x.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="card space-y-4 p-6" noValidate>
      <div><h2 className="font-bold">Datos de la empresa</h2><p className="text-xs text-mute">Aparecen en los recibos de venta.</p></div>
      <Field label="Nombre de la empresa" error={err.company_name}><input className={`input ${err.company_name ? 'err' : ''}`} value={f.company_name} onChange={(e) => set('company_name', e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="NIT" error={err.tax_id}><input className="input" value={f.tax_id} onChange={(e) => set('tax_id', e.target.value)} /></Field>
        <Field label="IVA (%)" error={err.tax_rate} hint="Se aplica a las ventas nuevas."><input className={`input ${err.tax_rate ? 'err' : ''}`} inputMode="decimal" value={f.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} /></Field>
      </div>
      <Field label="Dirección"><input className="input" value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
      <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Guardar cambios</button>
    </form>
  );
}

function Password() {
  const toast = useToast();
  const [f, setF] = useState({ current: '', next: '', again: '' }); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })); };
  async function save(e) {
    e.preventDefault(); setErr({});
    if (f.next.length < 8) return setErr({ next: 'Mínimo 8 caracteres.' });
    if (f.next !== f.again) return setErr({ again: 'Las contraseñas no coinciden.' });
    setBusy(true);
    try { await api.post('/auth/change-password', { current: f.current, next: f.next }); toast.ok('Contraseña actualizada.'); setF({ current: '', next: '', again: '' }); }
    catch (x) { setErr(x.fields || {}); if (!Object.keys(x.fields || {}).length) toast.error(x.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="card space-y-4 p-6" noValidate>
      <h2 className="font-bold">Cambiar contraseña</h2>
      <Field label="Contraseña actual" error={err.current}><input type="password" autoComplete="current-password" className={`input ${err.current ? 'err' : ''}`} value={f.current} onChange={(e) => set('current', e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contraseña nueva" error={err.next}><input type="password" autoComplete="new-password" className={`input ${err.next ? 'err' : ''}`} value={f.next} onChange={(e) => set('next', e.target.value)} /></Field>
        <Field label="Repite la nueva" error={err.again}><input type="password" autoComplete="new-password" className={`input ${err.again ? 'err' : ''}`} value={f.again} onChange={(e) => set('again', e.target.value)} /></Field>
      </div>
      <button className="btn-primary" disabled={busy || !f.current}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Actualizar contraseña</button>
    </form>
  );
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  return (
    <>
      <PageHeader title="Configuración" subtitle="Tu cuenta y, si eres administrador, los datos de la empresa." />
      <div className="grid max-w-3xl gap-5">
        <section className="card p-6">
          <h2 className="mb-4 font-bold">Mi cuenta</h2>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><dt className="text-xs text-mute">Nombre</dt><dd className="mt-0.5 font-semibold">{user.name}</dd></div>
            <div><dt className="text-xs text-mute">Correo</dt><dd className="mt-0.5 font-semibold">{user.email}</dd></div>
            <div><dt className="text-xs text-mute">Rol</dt><dd className="mt-1"><Badge tone={isAdmin ? 'violet' : 'blue'}>{ROLE[user.role]}</Badge></dd></div>
            <div><dt className="text-xs text-mute">Cargo</dt><dd className="mt-0.5">{user.position || '—'}</dd></div>
          </dl>
        </section>
        <Password />
        {isAdmin && <Company />}
      </div>
    </>
  );
}
