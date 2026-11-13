import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Receipt as ReceiptIcon, Ban, Minus, Trash2, Search, ShoppingCart, Loader2, PackageX } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Confirm, Empty, Field, PageHeader, Pagination, SearchBox, Spinner, useDebounced, useList, useToast } from '../ui.jsx';
import Receipt from '../components/Receipt.jsx';
import { money, int, dateTime } from '../format.js';

export function SalesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const dq = useDebounced(q);
  const list = useList('/sales', { q: dq, status, from, to });
  const [view, setView] = useState(null); const [cancel, setCancel] = useState(null); const [busy, setBusy] = useState(false);

  const openReceipt = async (id) => { try { setView(await api.get(`/sales/${id}`)); } catch (e) { toast.error(e.message); } };
  const doCancel = async () => {
    setBusy(true);
    try { await api.post(`/sales/${cancel.id}/cancel`); toast.ok(`Venta #${cancel.id} anulada. El stock volvió al inventario.`); setCancel(null); list.reload(); }
    catch (e) { toast.error(e.message); setCancel(null); } finally { setBusy(false); }
  };
  const filtered = q || status || from || to;

  return (
    <>
      <PageHeader title="Ventas" subtitle={isAdmin ? 'Todas las ventas del equipo.' : 'Tus ventas registradas.'}
        actions={<Link to="/ventas/nueva" className="btn-primary"><Plus className="h-4 w-4" />Nueva venta</Link>} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar por cliente, empleado o número" />
          <select className="input w-auto min-w-[150px]" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
            <option value="">Todos los estados</option><option value="completed">Completadas</option><option value="cancelled">Anuladas</option></select>
          <Field label="Desde"><input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Hasta"><input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        {list.error ? <Empty title="No pudimos cargar las ventas" text={list.error} action={<button className="btn-ghost" onClick={list.reload}>Reintentar</button>} />
          : list.loading && !list.data.length ? <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
          : !list.data.length ? <Empty title={filtered ? 'Sin resultados' : 'Aún no hay ventas'} text={filtered ? 'Prueba con otros filtros.' : 'Registra la primera venta: el stock se descuenta solo.'} action={!filtered && <Link to="/ventas/nueva" className="btn-primary"><Plus className="h-4 w-4" />Nueva venta</Link>} />
          : (
            <div className={`overflow-x-auto ${list.loading ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-line bg-ink-900/40"><tr><th className="th">N.º</th><th className="th">Fecha</th><th className="th">Cliente</th>{isAdmin && <th className="th">Atendió</th>}<th className="th">Productos</th><th className="th text-right">Total</th><th className="th w-px text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {list.data.map((s) => (
                    <tr key={s.id} className="hover:bg-ink-700/40">
                      <td className="td font-mono text-xs">#{s.id}</td>
                      <td className="td whitespace-nowrap text-mute">{dateTime(s.created_at)}</td>
                      <td className="td font-semibold">{s.customer_name || <span className="text-mute">Cliente eliminado</span>}</td>
                      {isAdmin && <td className="td">{s.employee_name || '—'}</td>}
                      <td className="td max-w-[260px] truncate text-mute" title={s.items?.map((i) => `${i.name} x${i.qty}`).join(', ')}>{s.items?.map((i) => `${i.name} x${i.qty}`).join(', ')}</td>
                      <td className="td text-right tabular-nums">{s.status === 'cancelled' ? <div className="flex flex-col items-end"><Badge tone="red">Anulada</Badge><span className="text-xs text-mute line-through">{money(s.total)}</span></div> : <span className="font-bold">{money(s.total)}</span>}</td>
                      <td className="td"><div className="flex justify-end gap-1">
                        <button className="btn-icon" onClick={() => openReceipt(s.id)} aria-label={`Ver recibo de la venta ${s.id}`}><ReceiptIcon className="h-4 w-4" /></button>
                        {isAdmin && s.status === 'completed' && <button className="btn-icon hover:!text-danger" onClick={() => setCancel(s)} aria-label={`Anular la venta ${s.id}`}><Ban className="h-4 w-4" /></button>}
                      </div></td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}
        <Pagination {...list} onPage={list.setPage} />
      </div>
      <Receipt sale={view} onClose={() => setView(null)} />
      <Confirm open={!!cancel} danger busy={busy} title="Anular venta" confirmLabel="Anular venta" onConfirm={doCancel} onClose={() => setCancel(null)}
        text={cancel ? `La venta #${cancel.id} de ${money(cancel.total)} quedará anulada y los productos volverán al inventario. No se puede revertir.` : ''} />
    </>
  );
}

export function NewSalePage() {
  const nav = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState([]); const [taxRate, setTaxRate] = useState(0.19);
  const [q, setQ] = useState(''); const dq = useDebounced(q, 250);
  const [results, setResults] = useState(null);
  const [cart, setCart] = useState([]);           // [{ id, sku, name, price, stock, qty }]
  const [customerId, setCustomerId] = useState(''); const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(null);

  useEffect(() => { api.get('/customers/options').then(setCustomers).catch(() => {}); api.get('/settings').then((s) => setTaxRate(s.tax_rate)).catch(() => {}); }, []);
  useEffect(() => { let on = true; api.get(`/products/search${qs({ q: dq })}`).then((r) => on && setResults(r)).catch(() => on && setResults([])); return () => { on = false; }; }, [dq]);

  const add = (p) => {
    if (p.stock < 1) return;
    setError('');
    setCart((c) => {
      const f = c.find((x) => x.id === p.id);
      if (f) return c.map((x) => (x.id === p.id ? { ...x, qty: Math.min(x.stock, x.qty + 1) } : x));
      return [...c, { ...p, qty: 1 }];
    });
  };
  const setQty = (id, qty) => setCart((c) => c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, Math.min(x.stock, Math.floor(qty) || 1)) } : x)));
  const remove = (id) => setCart((c) => c.filter((x) => x.id !== id));

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + Math.round(i.price * i.qty), 0);
    const tax = Math.round(subtotal * taxRate);
    return { subtotal, tax, total: subtotal + tax };
  }, [cart, taxRate]);

  async function submit() {
    setError('');
    if (!customerId) return setError('Elige el cliente de la venta.');
    if (!cart.length) return setError('Agrega al menos un producto.');
    setSaving(true);
    try {
      const sale = await api.post('/sales', { customer_id: Number(customerId), notes, items: cart.map((i) => ({ product_id: i.id, qty: i.qty })) });
      toast.ok(`Venta #${sale.id} registrada.`); setDone(sale);
    } catch (e) { setError(e.message); toast.error(e.message); api.get(`/products/search${qs({ q: dq })}`).then(setResults).catch(() => {}); }
    finally { setSaving(false); }
  }

  return (
    <>
      <PageHeader title="Nueva venta" subtitle="Busca productos, arma el pedido y confirma. El stock se descuenta al guardar."
        actions={<Link to="/ventas" className="btn-ghost">Volver a ventas</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <section className="card p-4">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
            <input className="input pl-10" placeholder="Buscar producto por nombre o SKU" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar producto" />
          </div>
          {results === null ? <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
            : !results.length ? <Empty title="No hay productos con ese nombre" text="Revisa el SKU o crea el producto en el módulo Productos." />
            : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {results.map((p) => {
                  const inCart = cart.find((x) => x.id === p.id);
                  return (
                    <li key={p.id}>
                      <button onClick={() => add(p)} disabled={p.stock < 1 || inCart?.qty >= p.stock}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-ink-900 p-3 text-left transition hover:border-brand/60 disabled:cursor-not-allowed disabled:opacity-50">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold">{p.name}</p><p className="font-mono text-xs text-mute">{p.sku}</p>
                          <p className={`mt-1 text-xs ${p.stock === 0 ? 'text-danger' : p.stock <= 5 ? 'text-amber' : 'text-mute'}`}>{p.stock === 0 ? 'Agotado' : `${int(p.stock)} disponibles`}{inCart ? ` · ${inCart.qty} en el pedido` : ''}</p></div>
                        <div className="shrink-0 text-right"><p className="text-sm font-bold">{money(p.price)}</p>{p.stock > 0 && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand"><Plus className="h-3 w-3" />Agregar</span>}</div>
                      </button>
                    </li>);
                })}
              </ul>)}
        </section>

        <aside className="card flex h-fit flex-col p-4 lg:sticky lg:top-20">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><ShoppingCart className="h-5 w-5 text-brand" />Pedido</h2>
          <Field label="Cliente *">
            <select className="input" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setError(''); }}>
              <option value="">Elige un cliente</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {!customers.length && <p className="mt-2 text-xs text-mute">No hay clientes. <Link to="/clientes" className="text-brand underline">Crea uno primero</Link>.</p>}
          <div className="my-4 divide-y divide-line rounded-xl border border-line">
            {!cart.length ? <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-mute"><PackageX className="h-4 w-4" />Agrega productos desde la lista.</p>
              : cart.map((i) => (
                <div key={i.id} className="p-3">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{i.name}</p>
                    <button className="btn-icon !h-7 !w-7 hover:!text-danger" onClick={() => remove(i.id)} aria-label={`Quitar ${i.name}`}><Trash2 className="h-4 w-4" /></button></div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button className="btn-icon !h-8 !w-8 border border-line" onClick={() => setQty(i.id, i.qty - 1)} disabled={i.qty <= 1} aria-label="Menos"><Minus className="h-4 w-4" /></button>
                      <input className="input !w-14 !px-1 !py-1.5 text-center" inputMode="numeric" value={i.qty} onChange={(e) => setQty(i.id, Number(e.target.value))} aria-label={`Cantidad de ${i.name}`} />
                      <button className="btn-icon !h-8 !w-8 border border-line" onClick={() => setQty(i.id, i.qty + 1)} disabled={i.qty >= i.stock} aria-label="Más"><Plus className="h-4 w-4" /></button>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{money(i.price * i.qty)}</p>
                  </div>
                  {i.qty >= i.stock && <p className="mt-1 text-xs text-amber">Llegaste al stock disponible ({i.stock}).</p>}
                </div>))}
          </div>
          <Field label="Notas (opcional)"><input className="input" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: entrega el viernes" /></Field>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">IVA ({Math.round(taxRate * 100)}%)</dt><dd className="tabular-nums">{money(totals.tax)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-lg font-extrabold"><dt>Total</dt><dd className="tabular-nums">{money(totals.total)}</dd></div>
          </dl>
          {error && <p className="mt-3 rounded-lg bg-danger/10 p-2.5 text-sm text-danger" role="alert">{error}</p>}
          <button className="btn-primary mt-4 w-full" onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar venta</button>
        </aside>
      </div>
      <Receipt sale={done} onClose={() => nav('/ventas')} />
    </>
  );
}
