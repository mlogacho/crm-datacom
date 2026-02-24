import React, { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Server, Shield, Wifi, Database, Radio, Package, Trash2 } from 'lucide-react';

const serviceCatalog = [
    { id: 'INT', name: 'Internet Corporativo', icon: Wifi, color: 'text-blue-500', bg: 'bg-blue-100' },
    { id: 'DAT', name: 'Transmisión de Datos', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-100' },
    { id: 'SAT', name: 'Enlaces Satelitales', icon: Radio, color: 'text-orange-500', bg: 'bg-orange-100' },
    { id: 'HOU', name: 'Housing / Colocation', icon: Server, color: 'text-slate-700', bg: 'bg-slate-200' },
    { id: 'HAC', name: 'Ethical Hacking', icon: Shield, color: 'text-red-500', bg: 'bg-red-100' },
    { id: 'EQP', name: 'Venta de Equipos', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-100' },
];

const mockClients = [
    { id: 1, name: 'Acme Corp' },
    { id: 2, name: 'TechSolutions' },
    { id: 3, name: 'GlobalNet' }
];

const initialServices = [
    { id: 101, clientId: 1, clientName: 'Acme Corp', type: 'INT', name: 'Internet Dedicado 1Gbps', status: 'Activo', price: '$850.00/mes', date: '2023-11-01' },
    { id: 102, clientId: 1, clientName: 'Acme Corp', type: 'HOU', name: 'Rack Completo 42U - Datacenter B', status: 'Activo', price: '$1,200.00/mes', date: '2023-11-05' },
    { id: 103, clientId: 2, clientName: 'TechSolutions', type: 'HAC', name: 'Auditoría Anual Pentesting', status: 'Programado', price: '$3,500.00', date: '2024-03-15' },
    { id: 104, clientId: 3, clientName: 'GlobalNet', type: 'SAT', name: 'Backup Satelital Banda Ku', status: 'Suspendido', price: '$450.00/mes', date: '2022-08-10' },
];

export default function ServicesList() {
    const [services, setServices] = useState(initialServices);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        clientId: '',
        type: 'INT',
        name: '',
        price: '',
        status: 'PROSPECTING'
    });

    const getServiceConfig = (typeId) => {
        return serviceCatalog.find(s => s.id === typeId) || serviceCatalog[0];
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const client = mockClients.find(c => c.id.toString() === formData.clientId);

        const newService = {
            id: services.length + 200,
            clientId: parseInt(formData.clientId),
            clientName: client ? client.name : 'Desconocido',
            ...formData,
            date: new Date().toISOString().split('T')[0]
        };

        setServices([newService, ...services]);
        setIsModalOpen(false);
        setFormData({ clientId: '', type: 'INT', name: '', price: '', status: 'PROSPECTING' });
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro que deseas eliminar permanentemente este servicio asignado?')) {
            setServices(services.filter(srv => srv.id !== id));
        }
    };

    const getStatusBadge = (status) => {
        const bgColors = {
            'PROSPECTING': 'bg-blue-100 text-blue-800',
            'CONTACTED': 'bg-indigo-100 text-indigo-800',
            'FIRST_MEETING': 'bg-purple-100 text-purple-800',
            'OFFERED': 'bg-yellow-100 text-yellow-800',
            'FOLLOW_UP': 'bg-orange-100 text-orange-800',
            'CLOSING_MEETING': 'bg-pink-100 text-pink-800',
            'DEMO': 'bg-cyan-100 text-cyan-800',
            'CONTRACT_SIGNED': 'bg-emerald-100 text-emerald-800',
            'BACKLOG': 'bg-slate-100 text-slate-800',
            'INSTALLED': 'bg-green-100 text-green-800',
            'LOST': 'bg-red-100 text-red-800',
        };
        const labels = {
            'PROSPECTING': 'Prospección',
            'CONTACTED': 'Contactado',
            'FIRST_MEETING': 'Primera Cita',
            'OFFERED': 'Ofertado',
            'FOLLOW_UP': 'Seguimiento',
            'CLOSING_MEETING': 'Cita de Cierre',
            'DEMO': 'Demo',
            'CONTRACT_SIGNED': 'Firma de Contrato',
            'BACKLOG': 'Backlog',
            'INSTALLED': 'Instalado',
            'LOST': 'Negocio Perdido',
        };
        const colorClass = bgColors[status] || 'bg-slate-100 text-slate-800';
        const labelText = labels[status] || status;

        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>{labelText}</span>;
    };

    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">Gestión de Servicios</h1>
                    <p className="mt-2 text-sm text-slate-600">Administra los servicios de Telecomunicaciones, Datos e Infraestructura asignados por cliente.</p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Asignar Servicio</span>
                    </button>
                </div>
            </div>

            {/* Catálogo visual rápido */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {serviceCatalog.map((cat) => (
                    <div key={cat.id} className="card p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer">
                        <div className={`w-10 h-10 rounded-full ${cat.bg} ${cat.color} flex items-center justify-center mb-3`}>
                            <cat.icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 leading-tight">{cat.name}</span>
                    </div>
                ))}
            </div>

            <div className="card mb-6">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Buscar por cliente o servicio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-outline flex items-center gap-2 w-full sm:w-auto mt-0">
                        <Filter className="w-4 h-4" />
                        <span>Filtros</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente Asignado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Servicio & Detalles</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Monto / Precio</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {services.filter(s => s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((service) => {
                                const config = getServiceConfig(service.type);
                                const Icon = config.icon;
                                return (
                                    <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900">{service.clientName}</div>
                                            <div className="text-xs text-slate-500">ID Cliente: #{service.clientId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg ${config.bg} ${config.color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-slate-900">{service.name}</div>
                                                    <div className="text-xs text-slate-500">{config.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(service.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                            {service.price}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleDelete(service.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Eliminar Servicio"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Asignación de Servicio */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Asignar Nuevo Servicio</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Cliente Destino <span className="text-red-500">*</span></label>
                                    <select required name="clientId" value={formData.clientId} onChange={handleInputChange} className="mt-1 input-field bg-white">
                                        <option value="">-- Seleccionar Cliente --</option>
                                        {mockClients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Tipo de Servicio <span className="text-red-500">*</span></label>
                                    <select required name="type" value={formData.type} onChange={handleInputChange} className="mt-1 input-field bg-white">
                                        {serviceCatalog.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Descripción Específica <span className="text-red-500">*</span></label>
                                    <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 input-field" placeholder="Ej. VPN Punto a Punto Sucursal Norte" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Monto del Servicio <span className="text-red-500">*</span></label>
                                        <input required type="text" name="price" value={formData.price} onChange={handleInputChange} className="mt-1 input-field" placeholder="Ej. $1,200/mes" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Estado Inicial</label>
                                        <select name="status" value={formData.status} onChange={handleInputChange} className="mt-1 input-field bg-white">
                                            <option value="PROSPECTING">Prospección</option>
                                            <option value="CONTACTED">Contactado</option>
                                            <option value="FIRST_MEETING">Primera Cita</option>
                                            <option value="OFFERED">Ofertado</option>
                                            <option value="FOLLOW_UP">Seguimiento</option>
                                            <option value="CLOSING_MEETING">Cita de Cierre</option>
                                            <option value="DEMO">Demo</option>
                                            <option value="CONTRACT_SIGNED">Firma de Contrato</option>
                                            <option value="BACKLOG">Backlog</option>
                                            <option value="INSTALLED">Instalado</option>
                                            <option value="LOST">Negocio Perdido</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-x-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    Guardar Servicio
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
