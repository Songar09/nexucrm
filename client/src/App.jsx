import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Spinner } from './ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { CustomersPage, ProductsPage, SuppliersPage, EmployeesPage } from './pages/Modules.jsx';
import { SalesPage, NewSalePage } from './pages/Sales.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function Protected({ admin, children }) {
  const { user, loading, isAdmin } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;       // un empleado no entra a módulos de administrador
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="proveedores" element={<SuppliersPage />} />
        <Route path="ventas" element={<SalesPage />} />
        <Route path="ventas/nueva" element={<NewSalePage />} />
        <Route path="empleados" element={<Protected admin><EmployeesPage /></Protected>} />
        <Route path="configuracion" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
