import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import ServicesList from './pages/ServicesList';
import ServiceCatalogList from './pages/ServiceCatalogList';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

// Configuración base de axios para todas las peticiones
axios.defaults.baseURL = '/';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');
  const { isLoading } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  axios.defaults.headers.common['Authorization'] = `Token ${token}`;

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Verificando sesión...</div>;
  }

  return children;
}

function PermissionGuard({ viewId, children }) {
  const { hasViewPermission } = useAuth();

  if (!hasViewPermission(viewId)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
        <p className="text-slate-500 max-w-md mx-auto">Tu rol no tiene los permisos necesarios para visualizar este módulo. Si crees que esto es un error, contacta al administrador.</p>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<PermissionGuard viewId="dashboard"><Dashboard /></PermissionGuard>} />
          <Route path="clients" element={<PermissionGuard viewId="clients"><ClientsList /></PermissionGuard>} />
          <Route path="services" element={<PermissionGuard viewId="services"><ServicesList /></PermissionGuard>} />
          <Route path="catalog" element={<PermissionGuard viewId="catalog"><ServiceCatalogList /></PermissionGuard>} />
          <Route path="settings" element={<PermissionGuard viewId="settings"><Settings /></PermissionGuard>} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Módulo en Construcción</h2>
              <p className="text-slate-500">Pronto podrás gestionar esta sección aquí.</p>
            </div>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
