import React, { useState, useEffect } from 'react';
import { Users, Server, AlertCircle, DollarSign, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import axios from 'axios';

export default function Dashboard() {
    const [stats, setStats] = useState([
        { name: 'Total Clientes', value: '0', icon: Users, change: 'Actualizado', changeType: 'increase' },
        { name: 'Servicios de Cliente', value: '0', icon: Server, change: 'Actualizado', changeType: 'increase' },
        { name: 'Tickets Abiertos', value: '45', icon: AlertCircle, change: '-14%', changeType: 'decrease' },
        { name: 'Facturación Mensual', value: '$248K', icon: DollarSign, change: '+4.3%', changeType: 'increase' },
    ]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch Clients Count
                const clientsRes = await axios.get('/api/clients/clients/');
                const clientsCount = clientsRes.data.count ?? (clientsRes.data.results ? clientsRes.data.results.length : clientsRes.data.length);

                // Fetch Services Count
                const servicesRes = await axios.get('/api/services/client-services/');
                const servicesCount = servicesRes.data.count ?? (servicesRes.data.results ? servicesRes.data.results.length : servicesRes.data.length);

                setStats(prev => [
                    { ...prev[0], value: clientsCount.toString() },
                    { ...prev[1], value: servicesCount.toString() },
                    prev[2],
                    prev[3]
                ]);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">Dashboard</h1>
                    <p className="mt-2 text-sm text-slate-600">Visión general del negocio y métricas clave.</p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <button className="btn-primary flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>Generar Reporte</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {stats.map((item) => (
                    <div key={item.name} className="card p-6 flex flex-col hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center text-sm font-medium ${item.changeType === 'increase' ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                {item.changeType === 'increase' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                                {item.change}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{item.name}</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card col-span-1 lg:col-span-2 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Ingresos Recientes</h2>
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <span className="text-slate-400 text-sm">El gráfico de barras se cargará aquí</span>
                    </div>
                </div>

                <div className="card col-span-1 p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
                        Tickets Críticos
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">3 Nuevos</span>
                    </h2>
                    <div className="flex-1 flex flex-col gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Caída de Nodo Central B</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Cliente: Telecom Express</p>
                                    <p className="text-xs text-slate-400 mt-1">Hace 2 horas</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
