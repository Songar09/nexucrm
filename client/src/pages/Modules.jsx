import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import CrudPage from '../components/CrudPage.jsx';
import { Badge, Spinner } from '../ui.jsx';
import { money, int, dateTime, dateOnly, ROLE, CUSTOMER_STATUS } from '../format.js';

const dash = <span className="text-mute">—</span>;
const statusTone = { prospect: 'amber', active: 'green', inactive: 'gray' };
const opts = (obj) => Object.entries(obj).map(([value, label]) => ({ value, label }));

/* ---------------- Clientes ---------------- */
function CustomerDetail({ row }) {
  const [c, setC] = useState(null);
  useEffect(() => { api.get(`/customers/${row.id}`).then(setC).catch(() => setC({ ...row, sales: [] })); }, [row]);
  if (!c) return <div className="flex justify-center py-10"><Spinner className="h-6 w-6" /></div>;
  const item = (l, v) => <div><dt className="text-xs text-mute">{l}</dt><dd className="mt-0.5 text-sm">{v || dash}</dd></div>;
  return (
    <div className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        {item('Documento', c.tax_id)}{item('Correo', c.email)}{item('Teléfono', c.phone)}
        {item('Dirección', c.address)}{item('Estado', <Badge tone={statusTone[c.status]}>{CUSTOMER_STATUS[c.status]}</Badge>)}{item('Cliente desde', dateOnly(c.created_at))}
      </dl>
      {c.notes && <p className="rounded-xl bg-ink-900 p-3 text-sm text-slate-300">{c.notes}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-ink-900 p-4"><p className="text-xs text-mute">Total comprado</p><p className="mt-1 text-xl font-extrabold">{money(c.total_spent)}</p></div>
        <div className="rounded-xl bg-ink-900 p-4"><p className="text-xs text-mute">Compras</p><p className="mt-1 text-xl font-extrabold">{int(c.purchases)}</p></div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold">Historial de compras</h3>
        {!c.sales.length ? <p className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-mute">Este cliente todavía no tiene compras.</p> : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {c.sales.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div><p className="font-semibold">Venta #{s.id} · {dateTime(s.created_at)}</p><p className="text-xs text-mute">{s.items} · atendió {s.employee || 'usuario eliminado'}</p></div>
                <div className="flex items-center gap-2">{s.status === 'cancelled' && <Badge tone="red">Anulada</Badge>}<span className={`font-bold ${s.status === 'cancelled' ? 'text-mute line-through' : ''}`}>{money(s.total)}</span></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
export function CustomersPage() {
  const cfg = useMemo(() => ({
    title: 'Clientes', subtitle: 'Prospectos y clientes con su historial de compras.', singular: 'Cliente', plural: 'clientes', endpoint: '/customers',
    searchPlaceholder: 'Buscar por nombre, documento, correo o teléfono', emptyText: 'Registra tu primer cliente para empezar a vender.',
    blank: { name: '', tax_id: '', email: '', phone: '', address: '', status: 'prospect', notes: '' },
    columns: [
      { key: 'name', label: 'Cliente', render: (r) => <div><p className="font-semibold">{r.name}</p><p className="text-xs text-mute">{r.tax_id || 'Sin documento'}</p></div> },
      { key: 'contact', label: 'Contacto', render: (r) => <div className="text-sm"><p>{r.email || dash}</p><p className="text-xs text-mute">{r.phone}</p></div> },
      { key: 'status', label: 'Estado', render: (r) => <Badge tone={statusTone[r.status]}>{CUSTOMER_STATUS[r.status]}</Badge> },
      { key: 'total_spent', label: 'Total comprado', className: 'text-right tabular-nums', render: (r) => money(r.total_spent) },
    ],
    fields: [
      { name: 'name', label: 'Nombre o razón social', required: true, full: true },
      { name: 'tax_id', label: 'Documento (NIT o cédula)' }, { name: 'status', label: 'Estado', type: 'select', options: opts(CUSTOMER_STATUS) },
      { name: 'email', label: 'Correo', type: 'email' }, { name: 'phone', label: 'Teléfono' },
      { name: 'address', label: 'Dirección', full: true }, { name: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    filters: [{ name: 'status', label: 'Todos los estados', options: opts(CUSTOMER_STATUS) }],
    detail: (row) => <CustomerDetail row={row} />,
    deleteText: (r) => `Vas a eliminar a “${r.name}”. Si ya tiene ventas, el sistema no lo permitirá y podrás marcarlo como inactivo.`,
  }), []);
  return <CrudPage cfg={cfg} />;
}

/* ---------------- Proveedores ---------------- */
export function SuppliersPage() {
  const [cats, setCats] = useState([]);
  useEffect(() => { api.get('/suppliers/categories').then(setCats).catch(() => {}); }, []);
  const cfg = useMemo(() => ({
    title: 'Proveedores', subtitle: 'Empresas que te abastecen y los productos que te suministran.', singular: 'Proveedor', plural: 'proveedores', endpoint: '/suppliers', nameKey: 'company',
    searchPlaceholder: 'Buscar por empresa, contacto o correo', emptyText: 'Registra a quienes te surten para vincularlos a tus productos.',
    blank: { company: '', contact: '', phone: '', email: '', address: '', category: '', notes: '' },
    columns: [
      { key: 'company', label: 'Empresa', render: (r) => <div><p className="font-semibold">{r.company}</p><p className="text-xs text-mute">{r.contact || 'Sin contacto'}</p></div> },
      { key: 'phone', label: 'Teléfono' }, { key: 'email', label: 'Correo' },
      { key: 'category', label: 'Categoría', render: (r) => r.category ? <Badge tone="blue">{r.category}</Badge> : dash },
      { key: 'product_count', label: 'Productos', className: 'text-right tabular-nums' },
    ],
    fields: [
      { name: 'company', label: 'Empresa', required: true, full: true }, { name: 'contact', label: 'Persona de contacto' }, { name: 'category', label: 'Categoría de suministro', placeholder: 'Ej: Tecnología' },
      { name: 'phone', label: 'Teléfono' }, { name: 'email', label: 'Correo', type: 'email' },
      { name: 'address', label: 'Dirección', full: true }, { name: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    filters: [{ name: 'category', label: 'Todas las categorías', options: cats.map((c) => ({ value: c, label: c })) }],
    onChange: () => api.get('/suppliers/categories').then(setCats).catch(() => {}),
  }), [cats]);
  return <CrudPage cfg={cfg} />;
}

/* ---------------- Productos ---------------- */
export function ProductsPage() {
  const [sup, setSup] = useState([]); const [cats, setCats] = useState([]);
  const loadCats = () => api.get('/products/categories').then(setCats).catch(() => {});
  useEffect(() => { api.get('/suppliers/options').then(setSup).catch(() => {}); loadCats(); }, []);
  const cfg = useMemo(() => ({
    title: 'Productos', subtitle: 'Inventario, precios y alertas de stock bajo.', singular: 'Producto', plural: 'productos', endpoint: '/products',
    searchPlaceholder: 'Buscar por nombre, SKU o descripción', emptyText: 'Crea tus productos para poder registrar ventas.',
    blank: { sku: '', name: '', description: '', category: '', cost: '', price: '', stock: '', min_stock: '5', supplier_id: '' },
    toForm: (r) => ({ ...r, supplier_id: r.supplier_id ?? '' }),
    columns: [
      { key: 'name', label: 'Producto', render: (r) => <div><p className="font-semibold">{r.name}</p><p className="font-mono text-xs text-mute">{r.sku}{r.category ? ` · ${r.category}` : ''}</p></div> },
      { key: 'supplier_name', label: 'Proveedor' },
      { key: 'price', label: 'Precio', className: 'text-right tabular-nums', render: (r) => <div><p>{money(r.price)}</p><p className="text-xs text-mute">costo {money(r.cost)}</p></div> },
      { key: 'stock', label: 'Stock', className: 'text-right', render: (r) => r.stock === 0 ? <Badge tone="red">Agotado</Badge> : r.stock <= r.min_stock ? <Badge tone="amber">{r.stock} · bajo</Badge> : <span className="tabular-nums">{int(r.stock)}</span> },
    ],
    fields: [
      { name: 'sku', label: 'Código SKU', required: true }, { name: 'name', label: 'Nombre', required: true },
      { name: 'category', label: 'Categoría', placeholder: 'Ej: Periféricos', hint: cats.length ? `Existentes: ${cats.slice(0, 4).join(', ')}` : undefined },
      { name: 'supplier_id', label: 'Proveedor', type: 'select', optional: 'Sin proveedor', options: () => sup.map((s) => ({ value: s.id, label: s.company })) },
      { name: 'cost', label: 'Precio de costo (COP)', type: 'number', min: 0 }, { name: 'price', label: 'Precio de venta (COP)', type: 'number', min: 0, required: true },
      { name: 'stock', label: 'Stock actual', type: 'number', min: 0 }, { name: 'min_stock', label: 'Stock mínimo', type: 'number', min: 0, hint: 'Se avisa cuando el stock llega a esta cifra.' },
      { name: 'description', label: 'Descripción', type: 'textarea', full: true },
    ],
    filters: [
      { name: 'stock', label: 'Todo el stock', options: [{ value: 'ok', label: 'Stock suficiente' }, { value: 'low', label: 'Stock bajo' }, { value: 'out', label: 'Agotado' }] },
      { name: 'category', label: 'Todas las categorías', options: cats.map((c) => ({ value: c, label: c })) },
    ],
    onChange: loadCats,
    deleteText: (r) => `Vas a eliminar “${r.name}”. Las ventas anteriores conservarán su nombre y SKU.`,
  }), [sup, cats]);
  return <CrudPage cfg={cfg} />;
}

/* ---------------- Empleados (solo administrador) ---------------- */
export function EmployeesPage() {
  const { user } = useAuth();
  const cfg = useMemo(() => ({
    title: 'Empleados', subtitle: 'Crea las cuentas de tu equipo. No hay registro público: solo un administrador puede dar acceso.', singular: 'Empleado', plural: 'empleados', endpoint: '/users',
    searchPlaceholder: 'Buscar por nombre, correo o cargo', emptyText: 'Crea cuentas para tu equipo de ventas.',
    blank: { name: '', email: '', position: '', role: 'employee', active: 'true', password: '' },
    toForm: (r) => ({ name: r.name, email: r.email, position: r.position, role: r.role, active: String(r.active), password: '' }),
    toBody: (f) => ({ ...f, active: f.active === 'true', password: f.password || undefined }),
    columns: [
      { key: 'name', label: 'Empleado', render: (r) => <div><p className="font-semibold">{r.name}{r.id === user.id && <span className="ml-2 text-xs font-normal text-mute">(tú)</span>}</p><p className="text-xs text-mute">{r.email}</p></div> },
      { key: 'position', label: 'Cargo' },
      { key: 'role', label: 'Rol', render: (r) => <Badge tone={r.role === 'admin' ? 'violet' : 'blue'}>{ROLE[r.role]}</Badge> },
      { key: 'active', label: 'Estado', render: (r) => <Badge tone={r.active ? 'green' : 'gray'}>{r.active ? 'Activo' : 'Desactivado'}</Badge> },
      { key: 'sales_total', label: 'Ventas', className: 'text-right', render: (r) => <div className="tabular-nums"><p>{money(r.sales_total)}</p><p className="text-xs text-mute">{int(r.sales_count)} ventas</p></div> },
    ],
    fields: (isNew) => [
      { name: 'name', label: 'Nombre completo', required: true, full: true }, { name: 'email', label: 'Correo de acceso', type: 'email', required: true }, { name: 'position', label: 'Cargo' },
      { name: 'role', label: 'Rol', type: 'select', options: opts(ROLE), hint: 'Los administradores gestionan empleados y configuración.' },
      { name: 'active', label: 'Estado', type: 'select', options: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Desactivado' }] },
      { name: 'password', label: isNew ? 'Contraseña inicial' : 'Nueva contraseña', type: 'password', required: isNew, hint: isNew ? 'Mínimo 8 caracteres. Compártela de forma segura.' : 'Déjala vacía para no cambiarla.', full: true },
    ],
    filters: [{ name: 'role', label: 'Todos los roles', options: opts(ROLE) }, { name: 'active', label: 'Todos los estados', options: [{ value: '1', label: 'Activos' }, { value: '0', label: 'Desactivados' }] }],
    canDelete: (u, r) => r.id !== u.id,
    deleteText: (r) => `Vas a eliminar la cuenta de ${r.name}. Si ya registró ventas, el sistema no lo permitirá: desactívala para conservar el historial.`,
  }), [user.id]);
  return <CrudPage cfg={cfg} />;
}
