import { api } from './api.js';
import { money, int, pct } from './format.js';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (t, ...words) => words.some((w) => t.includes(w));

export const SUGGESTIONS = ['¿Cómo registro una venta?', '¿Cuánto vendí hoy?', '¿Qué productos tienen stock bajo?', '¿Cómo creo un cliente?'];

let dashCache = { at: 0, data: null };
async function dash() {
  if (Date.now() - dashCache.at < 15000 && dashCache.data) return dashCache.data;
  const data = await api.get('/dashboard'); dashCache = { at: Date.now(), data }; return data;
}

/** Asistente local por palabras clave: funciona sin ninguna API externa. Devuelve { text, link? } */
export async function localReply(input, user) {
  const t = norm(input);
  const admin = user?.role === 'admin';
  const own = admin ? '' : ' (solo cuenta tus ventas)';

  if (!t) return { text: 'Escríbeme tu pregunta y te ayudo con el CRM.' };

  // --- datos en vivo
  if (has(t, 'hoy') && has(t, 'vend', 'venta')) { const d = (await dash()).kpis; return { text: `Hoy llevas ${money(d.sales_today)} en ${int(d.sales_today_count)} ${d.sales_today_count === 1 ? 'venta' : 'ventas'}${own}.`, link: ['/ventas', 'Ver ventas'] }; }
  if (has(t, 'mes') && has(t, 'vend', 'venta', 'ingres', 'factur')) { const d = (await dash()).kpis; return { text: `En lo que va del mes: ${money(d.sales_month)} en ${int(d.sales_month_count)} ventas${own}. ${d.growth === null ? 'Aún no hay un mes anterior para comparar.' : `Frente al mes pasado es ${d.growth >= 0 ? '+' : ''}${pct(d.growth)}.`}`, link: ['/', 'Ir al panel'] }; }
  if (has(t, 'stock', 'inventario', 'agotad', 'quedan', 'existencia') && has(t, 'bajo', 'poco', 'agot', 'alert', 'acab', 'quedan', 'minimo', 'cuales', 'que productos')) {
    const d = await dash();
    if (!d.lowStock.length) return { text: 'Todo el inventario está por encima del mínimo.', link: ['/productos', 'Ver productos'] };
    return { text: `Tienes ${d.kpis.low_stock} producto${d.kpis.low_stock === 1 ? '' : 's'} con stock bajo. Los más urgentes: ${d.lowStock.slice(0, 4).map((p) => `${p.name} (${p.stock === 0 ? 'agotado' : p.stock + ' und.'})`).join(', ')}.`, link: ['/productos', 'Ver inventario'] };
  }
  if (has(t, 'cuantos clientes', 'numero de clientes', 'total de clientes')) { const d = (await dash()).kpis; return { text: `Tienes ${int(d.customers)} clientes: ${int(d.customers_active)} activos y ${int(d.customers_prospects)} prospectos.`, link: ['/clientes', 'Ver clientes'] }; }
  if (has(t, 'mejor cliente', 'mejores clientes', 'quien compra mas', 'que mas compran')) { const d = await dash(); return d.topCustomers.length ? { text: `Tus mejores clientes: ${d.topCustomers.slice(0, 3).map((c) => `${c.name} (${money(c.total)})`).join(', ')}.` } : { text: 'Todavía no hay ventas para armar el ranking.' }; }
  if (has(t, 'mas vendido', 'top producto', 'producto estrella')) { const d = await dash(); return d.topProducts.length ? { text: `Los más vendidos de los últimos 90 días: ${d.topProducts.slice(0, 3).map((p) => `${p.name} (${money(p.total)})`).join(', ')}.` } : { text: 'Aún no hay ventas para calcularlo.' }; }

  // --- cómo hacer…
  if (has(t, 'anular', 'cancelar venta', 'devolver', 'devolucion')) return admin
    ? { text: 'En Ventas, usa el ícono de anular (⊘) de la fila. La venta queda marcada como anulada y los productos regresan al inventario. No se puede revertir.', link: ['/ventas', 'Ir a Ventas'] }
    : { text: 'Solo un administrador puede anular ventas. Pídele que lo haga indicando el número de la venta.' };
  if (has(t, 'recibo', 'imprimir', 'comprobante', 'factura')) return { text: 'Al confirmar una venta se abre el recibo con los botones Imprimir y Descargar. Para reabrirlo después, entra a Ventas y toca el ícono del recibo en la fila.', link: ['/ventas', 'Ir a Ventas'] };
  if (has(t, 'venta', 'vender', 'registrar una venta', 'facturar')) return { text: 'Entra a Ventas → Nueva venta. Elige el cliente, busca y agrega productos, ajusta cantidades y confirma. El sistema valida el stock, calcula el IVA y descuenta el inventario solo.', link: ['/ventas/nueva', 'Nueva venta'] };
  if (has(t, 'cliente') && has(t, 'crear', 'agregar', 'registrar', 'nuevo', 'anadir')) return { text: 'En Clientes toca “Nuevo cliente”. Solo el nombre es obligatorio. Un prospecto pasa a activo en su primera compra.', link: ['/clientes', 'Ir a Clientes'] };
  if (has(t, 'producto') && has(t, 'crear', 'agregar', 'registrar', 'nuevo', 'anadir')) return { text: 'En Productos toca “Nuevo producto”: SKU y precio son obligatorios. Define el stock mínimo para recibir alertas cuando se esté acabando.', link: ['/productos', 'Ir a Productos'] };
  if (has(t, 'proveedor')) return { text: 'En Proveedores puedes registrar a quienes te surten y luego vincularlos al crear o editar un producto. Un proveedor con productos vinculados no se puede eliminar.', link: ['/proveedores', 'Ir a Proveedores'] };
  if (has(t, 'empleado', 'usuario', 'vendedor', 'crear cuenta', 'dar acceso')) return admin
    ? { text: 'En Empleados toca “Nuevo empleado”: define correo, contraseña inicial y rol. No existe registro público, solo tú puedes dar acceso. Para quitar acceso sin perder su historial, desactívalo.', link: ['/empleados', 'Ir a Empleados'] }
    : { text: 'Las cuentas las crea un administrador. Si necesitas acceso para alguien más, pídeselo.' };
  if (has(t, 'contrasena', 'clave', 'password')) return { text: 'En Configuración → Cambiar contraseña. Debe tener al menos 8 caracteres. Si olvidaste la tuya, un administrador puede asignarte una nueva desde Empleados.', link: ['/configuracion', 'Ir a Configuración'] };
  if (has(t, 'rol', 'permiso', 'puedo ver', 'diferencia', 'administrador')) return { text: admin ? 'Administrador: ve todo y gestiona empleados y configuración. Empleado: trabaja con clientes, productos, proveedores y ventas, pero solo ve sus propias ventas y no accede a Empleados.' : 'Como empleado puedes gestionar clientes, productos, proveedores y tus propias ventas. Empleados y la configuración de la empresa son solo para administradores.' };
  if (has(t, 'iva', 'impuesto')) return { text: admin ? 'El IVA se define en Configuración y se aplica a las ventas nuevas (las anteriores conservan su tasa).' : 'El IVA lo define un administrador y se suma al subtotal de cada venta.', link: admin ? ['/configuracion', 'Ir a Configuración'] : undefined };
  if (has(t, 'gracias')) return { text: 'Con gusto. Si necesitas algo más, aquí estoy.' };
  if (has(t, 'hola', 'buenas', 'buenos dias', 'buenas tardes', 'hey')) return { text: `Hola, ${user?.name?.split(' ')[0] || ''}. Puedo explicarte cómo usar el CRM o darte cifras rápidas como las ventas de hoy o el stock bajo. ¿Qué necesitas?` };
  if (has(t, 'ayuda', 'que puedes', 'que haces', 'como funciona')) return { text: 'Puedo guiarte para registrar ventas, clientes, productos y proveedores, explicarte los roles, y darte cifras en vivo: ventas de hoy y del mes, stock bajo, mejores clientes y productos más vendidos.' };

  return { text: 'No estoy seguro de haber entendido. Prueba con preguntas como “¿cómo registro una venta?”, “¿cuánto vendí hoy?” o “¿qué productos tienen stock bajo?”.' };
}

/** Intenta la IA del servidor; si no está configurada o falla, usa el asistente local. */
let aiOn = null;   // se consulta una vez; evita peticiones fallidas cuando no hay IA configurada
export async function reply(history, user) {
  const last = history[history.length - 1].content;
  if (aiOn === null) aiOn = await api.get('/chat/status').then((r) => !!r.ai).catch(() => false);
  if (!aiOn) return localReply(last, user);
  try {
    const r = await api.post('/chat', { messages: history.map(({ role, content }) => ({ role, content })) });
    return { text: r.reply, ai: true };
  } catch { return localReply(last, user); }
}
