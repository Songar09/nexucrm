# NexuCRM

CRM full-stack para gestionar clientes, productos, proveedores, ventas y empleados, con panel analítico y asistente flotante.

- **Front:** React 18 + Vite + Tailwind CSS + Recharts
- **Back:** Node 22 + Express, base de datos SQLite (módulo nativo `node:sqlite`, sin compilar nada)
- **Seguridad:** contraseñas con bcrypt, sesiones con JWT, roles verificados en el servidor, límite de intentos en el login
- **Roles:** `Administrador` y `Empleado`. **No hay registro público**: solo un administrador crea cuentas (módulo Empleados).

## Acceso inicial

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@crm.com` | `Admin123*` |
| Empleado (demo) | `laura@crm.com` | `Empleado123*` |

> Cambia la contraseña del administrador al entrar (Configuración → Cambiar contraseña). Para producción real, arranca con `SEED_DEMO=0` y crea tus propios empleados.

## Probar en tu computador

Requiere Node **22.13 o superior**.

```bash
npm install
npm run build
JWT_SECRET=una-clave-larga npm start     # http://localhost:3000
```

Desarrollo con recarga: en dos terminales, `npm run dev:server` y `npm run dev:client` (http://localhost:5173).

## Publicarlo con un enlace público (gratis, ~5 minutos)

1. Crea una cuenta en [GitHub](https://github.com) y un repositorio nuevo (ej. `nexucrm`).
2. Sube esta carpeta: `git init && git add . && git commit -m "NexuCRM" && git branch -M main && git remote add origin <URL-del-repo> && git push -u origin main`.
3. Entra a [render.com](https://render.com) → **New → Blueprint** → elige el repositorio. Render lee `render.yaml`, genera el `JWT_SECRET` y despliega.
4. Al terminar te da una URL pública del estilo `https://nexucrm.onrender.com`.

También funciona en Railway, Fly.io o cualquier servidor con Docker (hay `Dockerfile`).

**Sobre los datos:** en el plan gratuito de Render el disco es temporal; si el servicio se duerme o se reconstruye, la base vuelve a los datos de demostración. Para conservar datos reales usa un disco persistente y define `DB_PATH` apuntando a él.

## Variables de entorno

Están documentadas en `.env.example`. Las importantes: `JWT_SECRET` (obligatoria en producción), `DB_PATH`, `SEED_DEMO`, `TZ_OFFSET_HOURS`.

**Chatbot con IA:** define `OPENAI_API_KEY` o `GEMINI_API_KEY` y el asistente responderá con IA. Sin claves (o si la IA falla) usa un asistente local por palabras clave que además consulta cifras en vivo.

## Qué ve cada rol

| Módulo | Administrador | Empleado |
|---|---|---|
| Panel | Todo el negocio | Solo sus propias ventas |
| Clientes, Productos, Proveedores | Crear, editar, eliminar | Crear, editar, eliminar |
| Ventas | Todas; puede anular | Solo las suyas; no anula |
| Empleados | Sí | No (la ruta redirige) |
| Configuración | Cuenta + datos de la empresa e IVA | Solo su cuenta |

## Reglas del negocio

- Al registrar una venta se valida el stock, se calcula el IVA en el servidor, se descuenta el inventario y se genera un recibo imprimible/descargable.
- Anular una venta devuelve el stock al inventario.
- Un cliente, proveedor, producto o empleado con historial no se elimina si eso rompería registros: se sugiere desactivarlo.
- Valores en pesos colombianos (COP).

## Estructura

```
server/   API Express, base de datos, rutas, chatbot relay, seed
client/   Aplicación React
dist/     Front compilado (lo genera `npm run build`)
```
