import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Users, PackageMinus, Wallet, Receipt, Boxes, Truck, ArrowUpRight } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Empty, PageHeader, Spinner } from '../ui.jsx';
import { money, compact, int, pct, dateTime, shortDay, monthName } from '../format.js';

const C = { green: '#1FA974', blue: '#2796CC', amber: '#CC7F18', violet: '#8461DB', other: '#5A6A88', grid: '#1E2D4A', axis: '#8D9BB8' };
const axisProps = { tick: { fill: C.axis, fontSize: 12 }, tickLine: false, axisLine: false };

function Tip({ active, payload, label, labelFmt, valueFmt = money, name = 'Ventas' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-ink-700 px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-slate-200">{labelFmt ? labelFmt(label) : label}</p>
      {payload.map((p) => <p key={p.dataKey} className="text-slate-300"><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.payload.fill }} />{p.name || name}: <b className="text-white">{valueFmt(p.value)}</b></p>)}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = 'green', to }) {
  const tones = { green: 'bg-brand/15 text-brand-300', blue: 'bg-sky/15 text-sky', amber: 'bg-amber/15 text-amber', violet: 'bg-violet/15 text-violet' };
  const body = (
    <div className="card h-full p-5 transition hover:border-ink-500">
      <div className="flex items-center justify-between"><p className="text-sm text-mute">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span></div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 text-xs text-mute">{sub}</div>
    </div>);
  return to ? <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 rounded-2xl">{body}</Link> : body;
}
const Panel = ({ title, hint, children, className = '', action }) => (
  <section className={`card p-5 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold">{title}</h2>{hint && <p className="text-xs text-mute">{hint}</p>}</div>{action}</div>
    {children}
  </section>);

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Empty title="No pudimos cargar el panel" text={err} action={<button className="btn-ghost" onClick={() => location.reload()}>Reintentar</button>} />;
  if (!d) return <div className="flex justify-center py-24"><Spinner className="h-7 w-7" /></div>;
  const k = d.kpis;
  const hasSales = d.salesByDay.some((x) => x.total > 0);

  // donut: 3 categorías principales + "Otras" (más de 4 colores no se distinguen)
  const colors = [C.green, C.blue, C.amber];
  const cat = d.byCategory.slice(0, 3).map((c, i) => ({ ...c, fill: colors[i] }));
  const rest = d.byCategory.slice(3).reduce((s, c) => s + c.total, 0);
  if (rest > 0) cat.push({ category: 'Otras', total: rest, fill: C.other });
  const catTotal = cat.reduce((s, c) => s + c.total, 0);

  const growth = k.growth;
  const first = user.name.split(' ')[0];

  return (
    <>
      <PageHeader title={`Hola, ${first}`} subtitle={isAdmin ? 'Así va el negocio: ventas, clientes e inventario.' : 'Estos son tus resultados. Las cifras de ventas incluyen solo las que registraste tú.'} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} label="Ventas de hoy" value={money(k.sales_today)} sub={`${int(k.sales_today_count)} ${k.sales_today_count === 1 ? 'venta' : 'ventas'}`} to="/ventas" />
        <Kpi icon={Receipt} tone="blue" label="Ventas del mes" value={money(k.sales_month)}
          sub={growth === null ? `${int(k.sales_month_count)} ventas · sin mes anterior para comparar` : <span className={`inline-flex items-center gap-1 ${growth >= 0 ? 'text-brand-300' : 'text-danger'}`}>{growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{growth >= 0 ? '+' : ''}{pct(growth)} vs. mes anterior (mismos días)</span>} />
        <Kpi icon={Users} tone="violet" label="Clientes" value={int(k.customers)} sub={`${int(k.customers_active)} activos · ${int(k.customers_prospects)} prospectos · ${int(k.new_customers_month)} nuevos este mes`} to="/clientes" />
        <Kpi icon={PackageMinus} tone="amber" label="Stock bajo" value={int(k.low_stock)} sub={k.out_of_stock ? `${int(k.out_of_stock)} agotado${k.out_of_stock === 1 ? '' : 's'} · de ${int(k.products)} productos` : `de ${int(k.products)} productos`} to="/productos" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kpi icon={Receipt} tone="blue" label="Ticket promedio del mes" value={money(k.avg_ticket)} sub="Incluye IVA" />
        <Kpi icon={Boxes} label="Valor del inventario" value={money(k.inventory_value)} sub={`Costo: ${money(k.inventory_cost)}`} />
        <Kpi icon={Truck} tone="violet" label="Proveedores" value={int(k.suppliers)} sub="Activos en el sistema" to="/proveedores" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel title="Ventas de los últimos 30 días" hint="Total diario con IVA, en pesos colombianos" className="xl:col-span-2">
          {!hasSales ? <Empty title="Todavía no hay ventas en este período" text="Cuando registres ventas verás aquí la tendencia." /> : (
            <div className="h-72" role="img" aria-label="Gráfica de área con las ventas diarias de los últimos 30 días">
              <ResponsiveContainer>
                <AreaChart data={d.salesByDay} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.35} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={shortDay} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis {...axisProps} tickFormatter={compact} width={64} />
                  <Tooltip content={<Tip labelFmt={shortDay} />} cursor={{ stroke: C.axis, strokeDasharray: 3 }} />
                  <Area type="monotone" dataKey="total" name="Ventas" stroke={C.green} strokeWidth={2} fill="url(#g1)" activeDot={{ r: 5, stroke: '#101A2D', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>)}
        </Panel>

        <Panel title="Ventas por categoría" hint="Últimos 90 días">
          {!catTotal ? <Empty title="Sin datos aún" /> : (
            <>
              <div className="h-44" role="img" aria-label="Gráfica de dona con las ventas por categoría">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={cat} dataKey="total" nameKey="category" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="#101A2D" strokeWidth={2}>
                      {cat.map((c) => <Cell key={c.category} fill={c.fill} />)}
                    </Pie>
                    <Tooltip content={<Tip name="" labelFmt={() => 'Categoría'} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {cat.map((c) => (
                  <li key={c.category} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.fill }} />{c.category}</span>
                    <span className="tabular-nums text-mute">{compact(c.total)} · <b className="text-slate-200">{pct(c.total / catTotal)}</b></span>
                  </li>))}
              </ul>
            </>)}
        </Panel>

        <Panel title="Ventas por mes" hint="Últimos 6 meses">
          <div className="h-60" role="img" aria-label="Gráfica de barras con las ventas de los últimos seis meses">
            <ResponsiveContainer>
              <BarChart data={d.salesByMonth} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="month" {...axisProps} tickFormatter={monthName} />
                <YAxis {...axisProps} tickFormatter={compact} width={64} />
                <Tooltip content={<Tip labelFmt={(m) => monthName(m)} />} cursor={{ fill: '#ffffff0d' }} />
                <Bar dataKey="total" name="Ventas" fill={C.blue} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Productos más vendidos" hint="Últimos 90 días, por valor vendido" className="xl:col-span-2">
          {!d.topProducts.length ? <Empty title="Sin datos aún" /> : (
            <div style={{ height: 40 + d.topProducts.length * 38 }} role="img" aria-label="Gráfica de barras horizontales con los productos más vendidos">
              <ResponsiveContainer>
                <BarChart data={d.topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={compact} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={170} tickFormatter={(n) => (n.length > 24 ? n.slice(0, 23) + '…' : n)} />
                  <Tooltip content={<Tip labelFmt={(n) => n} />} cursor={{ fill: '#ffffff0d' }} />
                  <Bar dataKey="total" name="Vendido" fill={C.violet} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>)}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Ventas recientes" action={<Link to="/ventas" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">Ver todas<ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          {!d.recent.length ? <Empty title="Sin ventas todavía" /> : (
            <ul className="divide-y divide-line">{d.recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0"><p className="truncate font-semibold">{s.customer_name || 'Cliente eliminado'}</p><p className="text-xs text-mute">#{s.id} · {dateTime(s.created_at)}{isAdmin && s.employee_name ? ` · ${s.employee_name}` : ''}</p></div>
                <span className="font-bold tabular-nums">{money(s.total)}</span>
              </li>))}</ul>)}
        </Panel>

        <Panel title="Alertas de stock" action={<Link to="/productos" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">Inventario<ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          {!d.lowStock.length ? <p className="rounded-xl bg-brand/10 p-4 text-sm text-brand-300">Todo el inventario está por encima del mínimo.</p> : (
            <ul className="divide-y divide-line">{d.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0"><p className="truncate font-semibold">{p.name}</p><p className="font-mono text-xs text-mute">{p.sku} · mínimo {p.min_stock}</p></div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.stock === 0 ? 'bg-danger/15 text-danger' : 'bg-amber/15 text-amber'}`}>{p.stock === 0 ? 'Agotado' : `${p.stock} und.`}</span>
              </li>))}</ul>)}
        </Panel>

        <Panel title={isAdmin ? 'Equipo: ventas del mes' : 'Mis mejores clientes'}>
          {isAdmin ? (!d.topEmployees.length ? <Empty title="Sin ventas este mes" /> : (
            <ul className="divide-y divide-line">{d.topEmployees.map((e, i) => (
              <li key={e.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-600 text-xs font-bold">{i + 1}</span><span><span className="block font-semibold">{e.name}</span><span className="text-xs text-mute">{e.n} ventas</span></span></span>
                <span className="font-bold tabular-nums">{money(e.total)}</span>
              </li>))}</ul>))
          : (!d.topCustomers.length ? <Empty title="Aún no tienes ventas" /> : (
            <ul className="divide-y divide-line">{d.topCustomers.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><span className="block font-semibold">{c.name}</span><span className="text-xs text-mute">{c.n} compras</span></span><span className="font-bold tabular-nums">{money(c.total)}</span></li>))}</ul>))}
        </Panel>
      </div>
      {isAdmin && d.topCustomers.length > 0 && (
        <Panel className="mt-5" title="Clientes que más compran" hint="Total histórico de ventas completadas">
          <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">{d.topCustomers.map((c) => (
            <li key={c.name} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm"><span><span className="block font-semibold">{c.name}</span><span className="text-xs text-mute">{c.n} compras</span></span><span className="font-bold tabular-nums">{money(c.total)}</span></li>))}</ul>
        </Panel>)}
    </>
  );
}
