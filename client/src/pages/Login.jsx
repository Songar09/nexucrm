import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LineChart, Boxes, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { Field } from '../ui.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const loc = useLocation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (user) return <Navigate to={loc.state?.from || '/'} replace />;

  async function submit(e) {
    e.preventDefault(); setError('');
    if (!email.trim() || !password) return setError('Escribe tu correo y tu contraseña.');
    setBusy(true);
    try { await login(email.trim(), password); } catch (err) { setError(err.message); setBusy(false); }
  }
  const demo = (e, p) => { setEmail(e); setPassword(p); setError(''); };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-brand/10 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-black text-ink-950">N</span><span className="text-lg font-extrabold">NexuCRM</span></div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Vende más con tus clientes e inventario en un solo lugar.</h1>
          <ul className="mt-8 space-y-5 text-sm text-slate-300">
            <li className="flex gap-3"><LineChart className="mt-0.5 h-5 w-5 shrink-0 text-brand" />Panel con ventas diarias, productos estrella y alertas de stock.</li>
            <li className="flex gap-3"><Boxes className="mt-0.5 h-5 w-5 shrink-0 text-sky" />Cada venta descuenta el inventario y genera su recibo.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet" />Acceso por rol: el administrador gestiona al equipo.</li>
          </ul>
        </div>
        <p className="relative text-xs text-mute">NexuSphere Intelligence S.A.S. · Bogotá, Colombia</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-black text-ink-950">N</span><span className="text-lg font-extrabold">NexuCRM</span></div>
          <h2 className="text-2xl font-extrabold tracking-tight">Inicia sesión</h2>
          <p className="mt-1 text-sm text-mute">Usa la cuenta que te dio tu administrador.</p>
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <Field label="Correo"><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" autoFocus /></Field>
            <Field label="Contraseña">
              <div className="relative">
                <input className="input pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="btn-icon absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </Field>
            {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Entrar</button>
          </form>
          {import.meta.env.VITE_DEMO_HINT !== '0' && (
            <div className="mt-8 rounded-xl border border-dashed border-line p-4 text-xs text-mute">
              <p className="mb-2 font-semibold text-slate-300">Cuentas de demostración</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => demo('admin@crm.com', 'Admin123*')}>Administrador</button>
                <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => demo('laura@crm.com', 'Empleado123*')}>Empleado</button>
              </div>
            </div>)}
        </div>
      </main>
    </div>
  );
}
