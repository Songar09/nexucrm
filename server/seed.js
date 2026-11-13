import bcrypt from 'bcryptjs';
import { db, tx } from './db.js';

const hash = (p) => bcrypt.hashSync(p, 10);

/** PRNG determinista: la demo se ve igual en cada despliegue. */
function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }

export function ensureAdmin() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (n) return false;
  db.prepare('INSERT INTO users (name,email,password_hash,role,position) VALUES (?,?,?,?,?)')
    .run('Administrador', 'admin@crm.com', hash('Admin123*'), 'admin', 'Administrador general');
  return true;
}

export function seedDemo() {
  tx(() => {
    const rand = rng(20260);
    const pick = (a) => a[Math.floor(rand() * a.length)];

    const upsert = db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    upsert.run('company_name', 'NexuSphere Intelligence S.A.S.'); upsert.run('tax_rate', '0.19');
    upsert.run('address', 'Bogotá, Colombia'); upsert.run('tax_id', '901.234.567-8');

    const users = [
      ['Laura Camila Rojas', 'laura@crm.com', 'Ejecutiva comercial'],
      ['Andrés Felipe Mora', 'andres@crm.com', 'Asesor de ventas'],
      ['Valentina Ríos', 'valentina@crm.com', 'Ejecutiva de cuentas'],
    ];
    const uIns = db.prepare('INSERT INTO users (name,email,password_hash,role,position) VALUES (?,?,?,?,?)');
    const employeeIds = users.map(([n, e, p]) => Number(uIns.run(n, e, hash('Empleado123*'), 'employee', p).lastInsertRowid));
    const inactive = uIns.run('Camilo Herrera', 'camilo@crm.com', hash('Empleado123*'), 'employee', 'Asesor (retirado)');
    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(inactive.lastInsertRowid);

    const sIns = db.prepare('INSERT INTO suppliers (company,contact,phone,email,address,category,notes) VALUES (?,?,?,?,?,?,?)');
    const suppliers = [
      ['Tecno Mayorista Colombia S.A.S.', 'Julián Castaño', '601 745 2210', 'ventas@tecnomayorista.co', 'Calle 13 # 68-45, Bogotá', 'Tecnología', 'Entrega en 48 horas hábiles.'],
      ['Distribuciones Andinas Ltda.', 'Marcela Ortiz', '604 322 8891', 'pedidos@andinas.com.co', 'Carrera 50 # 10-20, Medellín', 'Accesorios', 'Descuento por volumen desde 50 unidades.'],
      ['Redes y Cableado del Valle', 'Hernán Salcedo', '602 884 1175', 'contacto@redesvalle.co', 'Av. 3N # 24-18, Cali', 'Redes', ''],
      ['Papelería y Oficina Global', 'Diana Pardo', '601 612 4408', 'diana@oficinaglobal.co', 'Carrera 15 # 80-33, Bogotá', 'Oficina', 'Pago a 30 días.'],
      ['Seguridad Digital Caribe', 'Rafael Mendoza', '605 358 9902', 'rmendoza@segcaribe.co', 'Calle 72 # 54-10, Barranquilla', 'Seguridad', ''],
    ];
    const supIds = suppliers.map((s) => Number(sIns.run(...s).lastInsertRowid));

    const pIns = db.prepare('INSERT INTO products (sku,name,description,category,cost,price,stock,min_stock,supplier_id) VALUES (?,?,?,?,?,?,?,?,?)');
    // [sku, nombre, descripción, categoría, costo, precio, stock inicial, mínimo, proveedor]
    const products = [
      ['TEC-001', 'Teclado mecánico inalámbrico', 'Switch rojo, retroiluminado, conexión Bluetooth.', 'Periféricos', 118000, 189000, 140, 15, 0],
      ['TEC-002', 'Mouse ergonómico inalámbrico', 'Sensor óptico 4000 DPI, batería recargable.', 'Periféricos', 42000, 79900, 220, 25, 0],
      ['TEC-003', 'Monitor 24" Full HD', 'Panel IPS, 75 Hz, HDMI y VGA.', 'Pantallas', 410000, 599000, 60, 8, 0],
      ['TEC-004', 'Monitor 27" QHD', 'Panel IPS, 100 Hz, ajuste de altura.', 'Pantallas', 780000, 1090000, 35, 5, 0],
      ['TEC-005', 'Diadema con micrófono USB', 'Cancelación de ruido para videollamadas.', 'Periféricos', 65000, 119000, 110, 12, 1],
      ['TEC-006', 'Cámara web Full HD', 'Enfoque automático y micrófono integrado.', 'Periféricos', 72000, 129000, 95, 10, 1],
      ['TEC-007', 'Hub USB-C 7 en 1', 'HDMI 4K, lector SD, 3 USB, carga rápida.', 'Accesorios', 56000, 99000, 150, 20, 1],
      ['TEC-008', 'Disco SSD portátil 1 TB', 'USB 3.2, velocidad de lectura 1000 MB/s.', 'Almacenamiento', 285000, 399000, 70, 8, 0],
      ['TEC-009', 'Memoria USB 128 GB', 'USB 3.0 con carcasa metálica.', 'Almacenamiento', 22000, 39900, 260, 30, 1],
      ['RED-001', 'Router Wi-Fi 6 doble banda', 'Cobertura hasta 150 m², 4 antenas.', 'Redes', 190000, 289000, 55, 8, 2],
      ['RED-002', 'Switch de red 8 puertos Gigabit', 'Sin gestión, carcasa metálica.', 'Redes', 78000, 135000, 48, 6, 2],
      ['RED-003', 'Cable de red Cat6 305 m', 'Caja de cable UTP para instalaciones.', 'Redes', 310000, 449000, 22, 4, 2],
      ['OFI-001', 'Silla ergonómica de oficina', 'Soporte lumbar y brazos ajustables.', 'Oficina', 330000, 529000, 28, 5, 3],
      ['OFI-002', 'Escritorio ajustable eléctrico', 'Altura regulable 70-120 cm, memoria de 3 posiciones.', 'Oficina', 690000, 979000, 16, 3, 3],
      ['OFI-003', 'Lámpara LED de escritorio', 'Tres niveles de luz y carga inalámbrica.', 'Oficina', 48000, 89900, 90, 10, 3],
      ['SEG-001', 'Cámara IP de seguridad 2K', 'Visión nocturna, detección de movimiento.', 'Seguridad', 98000, 169000, 75, 10, 4],
      ['SEG-002', 'Cerradura digital con huella', 'Apertura por huella, clave y tarjeta.', 'Seguridad', 360000, 549000, 20, 4, 4],
      ['SEG-003', 'UPS 1000 VA', 'Respaldo para equipos de oficina, 6 tomas.', 'Seguridad', 230000, 349000, 34, 6, 4],
    ];
    const prodRows = products.map((p) => {
      const id = Number(pIns.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], supIds[p[8]]).lastInsertRowid);
      return { id, sku: p[0], name: p[1], price: p[5] };
    });

    const cIns = db.prepare('INSERT INTO customers (name,tax_id,email,phone,address,status,notes,created_at) VALUES (?,?,?,?,?,?,?,?)');
    const daysAgo = (d, h = 14) => { const t = new Date(Date.now() - d * 864e5); t.setUTCHours(h + 5, Math.floor(rand() * 60), 0, 0); return t.toISOString(); };
    const customers = [
      ['Clínica Dental Sonríe S.A.S.', '900.456.781-2', 'compras@clinicasonrie.co', '310 456 7812', 'Cra 11 # 93-40, Bogotá', 'active', 'Cliente recurrente, paga a 15 días.', 150],
      ['Constructora Horizonte Ltda.', '800.332.145-6', 'admin@chorizonte.com', '315 220 9034', 'Av. El Dorado # 69-76, Bogotá', 'active', '', 140],
      ['Café Origen Colombia', '901.118.456-1', 'gerencia@cafeorigen.co', '300 871 2290', 'Calle 85 # 15-20, Bogotá', 'active', '', 130],
      ['Estudio Jurídico Pardo & Asociados', '830.221.903-4', 'info@pardoasociados.co', '601 255 3318', 'Cra 7 # 71-21, Bogotá', 'active', 'Prefiere factura electrónica al correo.', 118],
      ['Agencia Creativa Pixel', '901.552.077-9', 'hola@agenciapixel.co', '312 664 0045', 'Calle 100 # 19-61, Bogotá', 'active', '', 105],
      ['Ferretería El Tornillo', '900.774.320-5', 'pedidos@eltornillo.co', '320 118 7765', 'Calle 19 # 4-88, Medellín', 'active', '', 96],
      ['Colegio Nuevo Amanecer', '860.402.115-0', 'rectoria@nuevoamanecer.edu.co', '601 487 1290', 'Cra 68 # 40-12, Bogotá', 'active', 'Compras por trimestre.', 88],
      ['Panadería La Espiga Dorada', '901.003.884-7', 'laespiga@gmail.com', '314 902 3381', 'Cll 45 # 23-10, Cali', 'active', '', 75],
      ['Transportes Rápido del Sur', '830.665.298-3', 'logistica@rapidosur.co', '300 553 8812', 'Av. Boyacá # 56-30, Bogotá', 'prospect', 'Pidió cotización para 10 equipos.', 40],
      ['Consultorio Médico Vida Plena', '900.998.126-8', 'citas@vidaplena.co', '317 250 4467', 'Cra 15 # 124-30, Bogotá', 'prospect', '', 28],
      ['Inmobiliaria Torres del Norte', '800.119.762-1', 'ventas@torresnorte.co', '310 774 0098', 'Cll 134 # 7-83, Bogotá', 'prospect', 'Interesado en cámaras y cerraduras.', 18],
      ['Restaurante Sabor Criollo', '901.225.640-2', 'admin@saborcriollo.co', '321 887 3350', 'Cra 43A # 5-33, Medellín', 'prospect', '', 9],
      ['Gimnasio Fuerza Total', '900.341.775-6', 'contacto@fuerzatotal.co', '315 411 0926', 'Cll 53 # 21-14, Bogotá', 'inactive', 'Sin compras en el último semestre.', 160],
      ['Droguería San Rafael', '890.223.514-9', 'sanrafael@drogueria.co', '606 335 2210', 'Cra 23 # 31-22, Manizales', 'inactive', '', 155],
    ];
    const custIds = customers.map((c) => Number(cIns.run(c[0], c[1], c[2], c[3], c[4], c[5], c[6], daysAgo(c[7])).lastInsertRowid));
    const buyers = custIds.slice(0, 8);

    // ventas: ~150 días, más actividad en los últimos 60 (la gráfica se ve viva)
    const sIns2 = db.prepare('INSERT INTO sales (customer_id,user_id,subtotal,tax_rate,tax,total,status,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    const iIns = db.prepare('INSERT INTO sale_items (sale_id,product_id,name,sku,qty,unit_price,line_total) VALUES (?,?,?,?,?,?,?)');
    const stock = new Map(db.prepare('SELECT id, stock FROM products').all().map((p) => [p.id, p.stock]));
    const sales = [];
    for (let d = 150; d >= 0; d--) {
      const weekday = new Date(Date.now() - d * 864e5).getDay();
      if (weekday === 0) continue;
      const base = d <= 60 ? 1.6 : 0.8;
      const n = Math.floor(rand() * 2 * base + (weekday === 6 ? 0 : 0.4));
      for (let k = 0; k < n; k++) sales.push(d);
    }
    for (const d of sales) {
      const lines = [];
      const count = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        const p = pick(prodRows); if (lines.find((l) => l.p.id === p.id)) continue;
        const cheap = p.price < 150000;
        const qty = 1 + Math.floor(rand() * (cheap ? 6 : 2));
        if ((stock.get(p.id) || 0) - qty < 2) continue;
        stock.set(p.id, stock.get(p.id) - qty);
        lines.push({ p, qty });
      }
      if (!lines.length) continue;
      const subtotal = lines.reduce((s, l) => s + Math.round(l.p.price * l.qty), 0);
      const tax = Math.round(subtotal * 0.19);
      const cancelled = rand() < 0.04;
      const created = daysAgo(d, 8 + Math.floor(rand() * 9));
      const sid = Number(sIns2.run(pick(buyers), pick(employeeIds), subtotal, 0.19, tax, subtotal + tax, cancelled ? 'cancelled' : 'completed', '', created).lastInsertRowid);
      for (const l of lines) iIns.run(sid, l.p.id, l.p.name, l.p.sku, l.qty, l.p.price, Math.round(l.p.price * l.qty));
      if (cancelled) for (const l of lines) stock.set(l.p.id, stock.get(l.p.id) + l.qty);   // anulada = repuesta
    }
    const upd = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
    for (const [id, s] of stock) upd.run(s, id);
    // dos productos con stock bajo para que la alerta tenga sentido
    db.prepare("UPDATE products SET stock = 3 WHERE sku = 'OFI-002'").run();
    db.prepare("UPDATE products SET stock = 0 WHERE sku = 'SEG-002'").run();
    db.prepare("UPDATE products SET stock = 5 WHERE sku = 'TEC-004'").run();
  });
}

export function seedIfEmpty() {
  const created = ensureAdmin();
  if (created && process.env.SEED_DEMO !== '0') seedDemo();
  return created;
}

// uso: node server/seed.js --reset
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  if (process.argv.includes('--reset')) {
    for (const t of ['sale_items', 'sales', 'products', 'suppliers', 'customers', 'users', 'settings']) db.exec(`DELETE FROM ${t}`);
    db.exec("DELETE FROM sqlite_sequence");
  }
  const made = seedIfEmpty();
  console.log(made ? 'Datos de demostración cargados. Acceso: admin@crm.com / Admin123*' : 'La base ya tiene datos. Usa --reset para reiniciarla.');
}
