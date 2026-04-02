import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Server, AlertCircle, DollarSign, ArrowUpRight, ArrowDownRight, Activity, Database } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { X, Check, FileDown, FileText } from "lucide-react";
import { useAuth } from '../context/AuthContext';
import { DATACOM_LOGO } from '../assets/logoBase64';

export default function Dashboard() {
    const { userPermissions, hasViewPermission } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState([
        { name: 'Total Clientes', value: '0', icon: Users, change: 'Actualizado', changeType: 'increase' },
        { name: 'Servicios Activos', value: '0', icon: Server, change: 'Actualizado', changeType: 'increase' },
        { name: 'Catálogo de Servicios', value: '0', icon: Database, change: 'Actualizado', changeType: 'increase' },
        { name: 'Facturación Mensual', value: '$0', icon: DollarSign, change: 'Actualizado', changeType: 'increase' },
    ]);

    const [chartData, setChartData] = useState([]);
    const [allClients, setAllClients] = useState([]);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedFields, setSelectedFields] = useState(['name', 'email', 'region', 'segment', 'account_manager_name']);

    const availableFields = [
        { id: 'name', label: 'Nombre Cliente' },
        { id: 'tax_id', label: 'RUC / Identificación' },
        { id: 'email', label: 'Email' },
        { id: 'phone', label: 'Teléfono' },
        { id: 'region', label: 'Región' },
        { id: 'city', label: 'Ciudad' },
        { id: 'segment', label: 'Segmento' },
        { id: 'service_location', label: 'Ubicación Servicio' },
        { id: 'account_manager_name', label: 'Gerente de Cuenta' },
        { id: 'classification', label: 'Clasificación' },
    ];

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (userPermissions === undefined) return;
            try {
                // Fetch Clients
                const clientsRes = await axios.get('/api/clients/clients/');
                let clientsList = clientsRes.data.results ? clientsRes.data.results : clientsRes.data;

                const isSuper = userPermissions?.is_superuser;
                const role = userPermissions?.role;
                const loggedName = userPermissions?.full_name || userPermissions?.username || '';

                // Filter specifically for Managers or Sales if not superuser
                if (!isSuper && (role === 'Gerente de Cuenta' || role === 'Ventas')) {
                    const loggedNameLower = loggedName.toLowerCase();
                    clientsList = clientsList.filter(c => {
                        const managerName = (c.account_manager_name || '').toLowerCase();
                        return managerName.includes(loggedNameLower);
                    });
                }

                const clientsCount = clientsList.length;
                setAllClients(clientsList);

                // Fetch Services
                const servicesRes = await axios.get('/api/services/client-services/');
                let servicesList = servicesRes.data.results ? servicesRes.data.results : servicesRes.data;

                if (!isSuper && (role === 'Gerente de Cuenta' || role === 'Ventas')) {
                    servicesList = servicesList.filter(s => {
                        const client = clientsList.find(c => c.id === s.client);
                        return client != null;
                    });
                }

                // Filter only ACTIVE services (status === 'INSTALLED')
                const activeServices = servicesList.filter(s => s.status === 'INSTALLED');
                const servicesCount = activeServices.length;

                // Calculate Monthly Revenue from Active Services
                const totalRevenue = activeServices.reduce((sum, service) => sum + parseFloat(service.agreed_price || 0), 0);
                const formattedRevenue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue);

                // Fetch Catalog
                const catalogRes = await axios.get('/api/services/catalog/');
                let catalogList = catalogRes.data.results ? catalogRes.data.results : catalogRes.data;
                const catalogCount = catalogList.length;

                setStats(prev => [
                    { ...prev[0], value: clientsCount.toString() },
                    { ...prev[1], value: servicesCount.toString() },
                    { ...prev[2], value: catalogCount.toString() },
                    { ...prev[3], value: formattedRevenue }
                ]);

                // Prepare Chart Data: Revenue per Account Manager (Top 5)
                const revenueByManager = {};
                activeServices.forEach(service => {
                    const client = clientsList.find(c => c.id === service.client);
                    const managerName = (client && client.account_manager_name) ? client.account_manager_name : 'Sin Asignar';
                    const price = parseFloat(service.agreed_price || 0);

                    if (!revenueByManager[managerName]) {
                        revenueByManager[managerName] = 0;
                    }
                    revenueByManager[managerName] += price;
                });

                const formattedChartData = Object.keys(revenueByManager)
                    .map(name => ({
                        name: name,
                        ingresos: revenueByManager[name]
                    }))
                    .sort((a, b) => b.ingresos - a.ingresos)
                    .slice(0, 5); // Top 5 managers by revenue

                setChartData(formattedChartData);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchDashboardData();
    }, [userPermissions]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                    <p className="font-semibold text-slate-900 mb-1">{label}</p>
                    <p className="text-emerald-600 font-medium">
                        Ingresos: ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            );
        }
        return null;
    };

    const handleFieldToggle = (fieldId) => {
        if (selectedFields.includes(fieldId)) {
            if (selectedFields.length > 1) { // Prevents unselecting all
                setSelectedFields(selectedFields.filter(f => f !== fieldId));
            }
        } else {
            setSelectedFields([...selectedFields, fieldId]);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header – Logo
        doc.addImage(DATACOM_LOGO, 'JPEG', 8, 3, 55, 22, 'datacomlogo');

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        const rightText = "FOR-SGIC-SI-1.0-REPORTE DE CLIENTES";
        doc.text(rightText, pageWidth - 14 - doc.getTextWidth(rightText), 20);

        // Horizontal Line
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.5);
        doc.line(14, 23, pageWidth - 14, 23);

        // Title
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const titleText = "REPORTE DE CLIENTES";
        doc.text(titleText, (pageWidth - doc.getTextWidth(titleText)) / 2, 35);

        // Metadata: Date and User
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES');
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const generatedBy = userPermissions?.full_name || userPermissions?.username || 'Usuario';

        doc.text(`Fecha y hora de emisión: ${dateStr} ${timeStr}`, 14, 45);
        doc.text(`Generado por: ${generatedBy}`, 14, 50);

        const headers = selectedFields.map(field => {
            const found = availableFields.find(af => af.id === field);
            return found ? found.label : field;
        });

        const data = allClients.map(client => {
            return selectedFields.map(field => {
                let val = client[field];
                if (field === 'classification') val = val === 'ACTIVE' ? 'Cliente Activo' : 'Prospecto';
                if (field === 'account_manager_name') val = client.account_manager_name || 'Sin Asignar';
                return val || 'N/A';
            });
        });

        autoTable(doc, {
            head: [headers],
            body: data,
            startY: 55,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save("Reporte_Clientes.pdf");
        setIsReportModalOpen(false);
    };

    const handleExportExcel = () => {
        const data = allClients.map(client => {
            const rowData = {};
            selectedFields.forEach(field => {
                const found = availableFields.find(af => af.id === field);
                const label = found ? found.label : field;
                let val = client[field];
                if (field === 'classification') val = val === 'ACTIVE' ? 'Cliente Activo' : 'Prospecto';
                if (field === 'account_manager_name') val = client.account_manager_name || 'Sin Asignar';
                rowData[label] = val || 'N/A';
            });
            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
        XLSX.writeFile(workbook, "Reporte_Clientes.xlsx");
        setIsReportModalOpen(false);
    };

    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">Dashboard</h1>
                    <p className="mt-2 text-sm text-slate-600">Visión general del negocio y métricas clave.</p>
                </div>
                {hasViewPermission('export_reports') && (
                <div className="mt-4 sm:mt-0">
                    <button onClick={() => setIsReportModalOpen(true)} className="btn-primary flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>Generar Reporte</span>
                    </button>
                </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {stats.map((item) => {
                    const isClickable = item.name === 'Servicios Activos' || item.name === 'Total Clientes' || item.name === 'Catálogo de Servicios';
                    const CardComponent = isClickable ? Link : 'div';

                    let cardProps = {};
                    if (item.name === 'Servicios Activos') cardProps = { to: '/services' };
                    if (item.name === 'Total Clientes') cardProps = { to: '/clients' };
                    if (item.name === 'Catálogo de Servicios') cardProps = { to: '/catalog' };

                    return (
                        <CardComponent key={item.name} {...cardProps} className={`card p-6 flex flex-col hover:shadow-md transition-shadow ${isClickable ? 'cursor-pointer hover:border-primary-300' : ''}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <div className={`flex items-center text-sm font-medium ${item.changeType === 'increase' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {item.changeType === 'increase' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                                    {item.change}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{item.name}</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{item.value}</p>
                            </div>
                        </CardComponent>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card col-span-1 lg:col-span-2 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Ingresos Recientes por Gerente de Cuenta (Top 5)</h2>
                    <div className="h-72 w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar
                                        dataKey="ingresos"
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={50}
                                        onClick={(data) => {
                                            const mgrName = data?.name || data?.payload?.name || (data?.activePayload && data.activePayload[0]?.payload?.name);
                                            if (mgrName) {
                                                navigate('/clients', { state: { filterManager: mgrName } });
                                            }
                                        }}
                                        cursor="pointer"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                <DollarSign className="w-8 h-8 text-slate-300 mb-2" />
                                <span className="text-slate-500 text-sm">No hay servicios instalados para mostrar ingresos.</span>
                            </div>
                        )}
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

            {/* Report Generator Modal */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                            <h2 className="text-xl font-bold text-slate-900">Generador de Reportes</h2>
                            <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-sm text-slate-600 mb-4">
                                Seleccione los campos que desea incluir en el reporte de clientes.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                {availableFields.map(field => {
                                    const isSelected = selectedFields.includes(field.id);
                                    return (
                                        <div
                                            key={field.id}
                                            onClick={() => handleFieldToggle(field.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'} cursor-pointer transition-colors`}
                                        >
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>{field.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center gap-3 justify-end flex-shrink-0">
                            <button onClick={handleExportPDF} className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                                <FileText className="w-4 h-4" />
                                Descargar PDF
                            </button>
                            <button onClick={handleExportExcel} className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                                <FileDown className="w-4 h-4" />
                                Descargar Excel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
