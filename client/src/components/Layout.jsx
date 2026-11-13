import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Truck, ShoppingCart, UserCog, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Menu, X } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { initials, ROLE } from '../format.js';
import Chatbot from './Chatbot.jsx';

const NAV = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/empleados', label: 'Empleados', icon: UserCog, admin: true },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('crm_sb') === '1'; } catch { return false; } });
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { try { localStorage.setItem('crm_sb', collapsed ? '1' : '0'); } catch { /* sin storage */ } }, [collapsed]);
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const items = NAV.filter((n) => !n.admin || isAdmin);

  const nav = (compact) => (
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Principal">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} title={compact ? label : undefined}
          className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${compact ? 'justify-center' : ''} ${isActive ? 'bg-brand/15 text-brand-300' : 'text-slate-300 hover:bg-ink-700 hover:text-white'}`}>
          <Icon className="h-5 w-5 shrink-0" />{!compact && <span>{label}</span>}{compact && <span className="sr-only">{label}</span>}
        </NavLink>))}
    </nav>
  );
  const brand = (compact) => (
    <div className={`flex h-16 items-center gap-3 border-b border-line px-4 ${compact ? 'justify-center' : ''}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand font-black text-ink-950">N</span>{!compact && <span className="text-lg font-extrabold tracking-tight">NexuCRM</span>}
    </div>);

  return (
    <div className="flex h-full">
      <aside className={`hidden shrink-0 flex-col border-r border-line bg-ink-950 transition-[width] duration-200 lg:flex ${collapsed ? 'w-[76px]' : 'w-64'} print:hidden`}>
        {brand(collapsed)}{nav(collapsed)}
        <div className="border-t border-line p-3">
          <button className={`btn-ghost w-full ${collapsed ? '!px-0' : ''}`} onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="h-5 w-5" />Contraer</>}
          </button>
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <div className="absolute inset-0 bg-black/60" aria-hidden />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-line bg-ink-950 shadow-pop">
            <div className="flex items-center justify-between pr-3">{brand(false)}<button className="btn-icon" onClick={() => setDrawer(false)} aria-label="Cerrar menú"><X className="h-5 w-5" /></button></div>
            {nav(false)}
          </aside>
        </div>)}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-ink-900/90 px-4 backdrop-blur sm:px-6 print:hidden">
          <button className="btn-icon lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menú"><Menu className="h-5 w-5" /></button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold leading-tight">{user.name}</p><p className="text-xs text-mute">{ROLE[user.role]}{user.position ? ` · ${user.position}` : ''}</p></div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-600 text-xs font-bold" aria-hidden>{initials(user.name)}</span>
            <button className="btn-icon" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><Outlet /></div></main>
      </div>
      <Chatbot />
    </div>
  );
}
