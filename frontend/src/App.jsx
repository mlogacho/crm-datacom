import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import ServicesList from './pages/ServicesList';
import Login from './pages/Login';

// Configuración base de axios para todas las peticiones
axios.defaults.baseURL = '/';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Si hay token, por defecto lo ponemos en los headers de axios
  axios.defaults.headers.common['Authorization'] = `Token ${token}`;

  return children;
}

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Aquí puedes agregar lógica si necesitas validar el token con el backend al cargar la app
    const token = localStorage.getItem('authToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
    }
    setIsInitializing(false);
  }, []);

  if (isInitializing) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="services" element={<ServicesList />} />
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
