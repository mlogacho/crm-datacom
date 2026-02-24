import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import ServicesList from './pages/ServicesList';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
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
