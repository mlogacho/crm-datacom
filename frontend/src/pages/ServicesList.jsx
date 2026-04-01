import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Server, Shield, Wifi, Database, Radio, Package, Trash2, Edit, Building2 } from 'lucide-react';
import axios from 'axios';

const catalogIcons = {
    'TELECOM': { icon: Wifi, color: 'text-blue-500', bg: 'bg-blue-100' },
    'HOUSING': { icon: Server, color: 'text-slate-700', bg: 'bg-slate-200' },
    'APP_DEV': { icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-100' },
    'OTHER': { icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-100' },
};

export default function ServicesList() {
    const [services, setServices] = useState([]);
    const [clients, setClients] = useState([]);
    const [catalogs, setCatalogs] = useState([]);

    const [filters, setFilters] = useState({
        search: '',
        client_name: '',
        status: '',
        account_manager: '',
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        client: '',
        service: '',
        status: 'PROSPECTING',
        agreed_price: '',
        nrc: '',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
        bandwidth: '',
        service_location: ''
    });

    useEffect(() => {
        fetchClients();
        fetchCatalogs();
        fetchAssignedServices();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await axios.get('/api/clients/clients/');
            setClients(response.data.results ? response.data.results : response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const response = await axios.get('/api/services/catalog/');
            const data = response.data.results ? response.data.results : response.data;
            const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            setCatalogs(sorted);
        } catch (error) {
            console.error('Error fetching catalogs:', error);
        }
    };

    const fetchAssignedServices = async () => {
        try {
            const response = await axios.get('/api/services/client-services/');
            setServices(response.data.results ? response.data.results : response.data);
        } catch (error) {
            console.error('Error fetching assigned services:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/services/client-services/', formData);
            fetchAssignedServices();
            setIsModalOpen(false);
            setFormData({ client: '', service: '', status: 'PROSPECTING', agreed_price: '', nrc: '', start_date: new Date().toISOString().split('T')[0], notes: '', bandwidth: '', service_location: '' });
            alert('Servicio asignado exitosamente.');
        } catch (error) {
            console.error('Error assigning service:', error);
            alert('Hubo un error al asignar el servicio. Verifica que los campos sean correctos.');
        }
    };

    const handleEditClick = (service) => {
        setEditingService({ ...service, new_note: '' });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const now = new Date();
            const timestamp = now.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

            let updatedNotes = editingService.notes || '';
            if (editingService.new_note && editingService.new_note.trim() !== '') {
                const separator = updatedNotes ? "\n---\n" : "";
                updatedNotes = `${updatedNotes}${separator}[${timestamp}]: ${editingService.new_note}`;
            }

            await axios.patch(`/api/services/client-services/${editingService.id}/`, {
                status: editingService.status,
                agreed_price: editingService.agreed_price,
                nrc: editingService.nrc || 0,
                bandwidth: editingService.bandwidth,
                service_location: editingService.service_location,
                notes: updatedNotes
            });
            fetchAssignedServices();
            setIsEditModalOpen(false);
            setEditingService(null);
            alert('Servicio actualizado exitosamente.');
        } catch (error) {
            console.error('Error updating service:', error);
            alert('Error al actualizar el servicio.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro que deseas eliminar permanentemente este servicio asignado?')) {
            try {
                await axios.delete(`/api/services/client-services/${id}/`);
                setServices(services.filter(srv => srv.id !== id));
            } catch (error) {
                console.error('Error deleting service:', error);
                alert('No se pudo eliminar el servicio.');
            }
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
            'BACKLOG': 'bg-emerald-100 text-emerald-800',
            'INSTALLED': 'bg-emerald-100 text-emerald-800',
            'BILLED': 'bg-green-100 text-green-800',
            'NEW_SERVICE': 'bg-blue-50 text-blue-700',
            'DOWN_GRADE': 'bg-amber-100 text-amber-800',
            'UP_GRADE': 'bg-violet-100 text-violet-800',
            'LOST': 'bg-red-100 text-red-800',
        };

        const colorClass = bgColors[status] || 'bg-slate-100 text-slate-800';
        const labelText = translateStatus(status);

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-current/20 uppercase ${colorClass}`}>
                {labelText}
            </span>
        );
    };

    const getClientStatusBadge = (status) => {
        if (status === 'Activo') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Activo</span>;
        if (status === 'Inactivo') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>;
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
    };

    const translateStatus = (status) => {
        if (!status) return status;
        const statusTranslations = {
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
            'BILLED': 'Facturado',
            'NEW_SERVICE': 'Servicio Nuevo',
            'DOWN_GRADE': 'Down Grade',
            'UP_GRADE': 'Up Grade',
            'LOST': 'Negocio Perdido'
        };

        if (status.includes(' - ')) {
            const parts = status.split(' - ');
            const main = statusTranslations[parts[0]] || parts[0];
            const sub = statusTranslations[parts[1]] || parts[1];
            return `${main} - ${sub}`;
        }
        return statusTranslations[status] || status;
    };

    const uniqueManagers = [...new Set(clients.map(c => c.account_manager).filter(Boolean))];
    const uniqueClients = [...new Set(clients.map(c => c.name).filter(Boolean))].sort();

    const filteredServices = services.filter((service) => {
        const catAssigned = catalogs.find(c => c.id === service.service);
        const clientAssigned = clients.find(c => c.id === service.client);

        const serviceName = catAssigned ? catAssigned.name.toLowerCase() : '';
        const clientName = clientAssigned ? clientAssigned.name.toLowerCase() : '';
        const managerName = clientAssigned && clientAssigned.account_manager ? clientAssigned.account_manager : '';

        const matchSearch = serviceName.includes(filters.search.toLowerCase()) || clientName.includes(filters.search.toLowerCase());
        const matchStatus = filters.status === '' || service.status === filters.status;
        const matchAccountManager = filters.account_manager === '' || managerName === filters.account_manager;
        const matchClient = filters.client_name === '' || (clientAssigned && clientAssigned.name === filters.client_name);

        return matchSearch && matchStatus && matchAccountManager && matchClient;
    });

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

            <div className="card mb-6">
                {/* Filtros Avanzados Bar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Buscar Servicio o Razón Social</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    name="search"
                                    className="input-field pl-9 text-sm py-2"
                                    placeholder="Buscar servicios..."
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Cliente</label>
                            <select name="client_name" value={filters.client_name} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                {uniqueClients.map(cName => <option key={cName} value={cName}>{cName}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Gerente de Cuenta</label>
                            <select name="account_manager" value={filters.account_manager} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                {uniqueManagers.map(mgr => <option key={mgr} value={mgr}>{mgr}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Estado en Embudo</label>
                            <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                <option value="PROSPECTING">Prospección</option>
                                <option value="CONTACTED">Contactado</option>
                                <option value="FIRST_MEETING">Primera Cita</option>
                                <option value="OFFERED">Ofertado</option>
                                <option value="FOLLOW_UP">Seguimiento</option>
                                <option value="CLOSING_MEETING">Cita de Cierre</option>
                                <option value="DEMO">Demo</option>
                                <option value="CONTRACT_SIGNED">Firma de Contrato</option>
                                <option value="BACKLOG">Backlog</option>
                                <option value="INSTALLED">Instalado (Activo)</option>
                                <option value="LOST">Negocio Perdido</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CLIENTE</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SERVICIO & ESTADO</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DETALLES OPERATIVOS</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">MONTO / PRECIO</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">FECHA INICIO</th>
                                <th scope="col" className="relative px-6 py-3 tracking-wider"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredServices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-sm text-slate-500">
                                        No se encontraron servicios que coincidan con los filtros.
                                    </td>
                                </tr>
                            ) : null}
                            {filteredServices.map((service) => {
                                const catAssigned = catalogs.find(c => c.id === service.service);
                                const clientAssigned = clients.find(c => c.id === service.client);
                                const config = catAssigned ? (catalogIcons[catAssigned.service_type] || catalogIcons['OTHER']) : catalogIcons['OTHER'];
                                const Icon = config.icon;

                                return (
                                    <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                                                    <Building2 className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-slate-900">{clientAssigned ? clientAssigned.name : 'Cliente Desconocido'}</div>
                                                    <div className="text-xs text-slate-500">{clientAssigned ? (clientAssigned.legal_name || clientAssigned.tax_id) : '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-start">
                                                <div className={`mt-1 flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg ${config.bg} ${config.color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-bold text-slate-900">
                                                        {catAssigned ? catAssigned.name : `Servicio ID #${service.service}`}
                                                    </div>
                                                    <div className="flex flex-col gap-1 items-start mt-1">
                                                        <div className="flex gap-1">
                                                            {clientAssigned && getClientStatusBadge(clientAssigned.is_active ? 'Activo' : 'Inactivo')}
                                                            {clientAssigned?.classification === 'PROSPECT' ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                                                                    {translateStatus(clientAssigned.prospect_status) || 'PROSPECTO'}
                                                                </span>
                                                            ) : clientAssigned ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                                                                    {translateStatus(clientAssigned.active_status) || 'ACTIVO'}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {getStatusBadge(service.status)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900 mb-1">
                                                <span className="font-semibold text-slate-500">G:</span> {clientAssigned?.account_manager || 'N/A'}
                                            </div>
                                            <div className="space-y-0.5">
                                                {service.bandwidth && (
                                                    <div className="text-[11px] text-slate-600">
                                                        <span className="font-semibold">Vel:</span> {service.bandwidth} Mbps
                                                    </div>
                                                )}
                                                {service.service_location && (
                                                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]" title={service.service_location}>
                                                        <span className="font-semibold">Loc:</span> {service.service_location}
                                                    </div>
                                                )}
                                                {service.notes && (
                                                    <div className="text-[11px] text-slate-400 italic truncate max-w-[180px]" title={service.notes}>
                                                        "{service.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900 font-bold">
                                                <span className="text-[10px] text-slate-400 font-normal mr-1">MRC:</span> ${service.agreed_price}
                                            </div>
                                            {service.nrc && Number(service.nrc) > 0 && (
                                                <div className="text-xs text-slate-500">
                                                    <span className="text-[10px] text-slate-400 mr-1">NRC:</span> ${service.nrc}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {service.start_date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleEditClick(service)}
                                                    className="text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="Editar Servicio"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(service.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Eliminar Servicio"
                                                >
                                                    <Trash2 className="w-5 h-5" />
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
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

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
                            <div className="grid grid-cols-1 gap-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Cliente Destino <span className="text-red-500">*</span></label>
                                        <select required name="client" value={formData.client} onChange={handleInputChange} className="mt-1 input-field bg-white">
                                            <option value="">-- Seleccionar --</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Tipo de Servicio <span className="text-red-500">*</span></label>
                                        <select required name="service" value={formData.service} onChange={handleInputChange} className="mt-1 input-field bg-white">
                                            <option value="">-- Seleccionar --</option>
                                            {catalogs.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.internal_code ? `[${s.internal_code}] ` : ''}{s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Monto Mensual (MRC) <span className="text-red-500">*</span></label>
                                        <input required type="number" step="0.01" name="agreed_price" value={formData.agreed_price} onChange={handleInputChange} className="mt-1 input-field" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Costo No Recurrente (NRC)</label>
                                        <input type="number" step="0.01" name="nrc" value={formData.nrc} onChange={handleInputChange} className="mt-1 input-field" placeholder="0.00" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Estado en Embudo</label>
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
                                            <option value="INSTALLED">Instalado (Activo)</option>
                                            <option value="LOST">Negocio Perdido</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Velocidad (Mbps)</label>
                                        <input type="text" name="bandwidth" value={formData.bandwidth} onChange={handleInputChange} className="mt-1 input-field" placeholder="e.g. 50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-slate-900">Ubicación del Servicio</label>
                                        <input type="text" name="service_location" value={formData.service_location} onChange={handleInputChange} className="mt-1 input-field" placeholder="Dirección o Punto" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Observaciones</label>
                                    <textarea name="notes" rows={2} value={formData.notes} onChange={handleInputChange} className="mt-1 input-field" placeholder="Notas adicionales..."></textarea>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-6">
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

            {/* Modal de EDICIÓN de Estado y Monto — v2.0 */}
            {
                isEditModalOpen && editingService && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>

                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800">Actualizar Servicio v2.0</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                                    <Plus className="w-6 h-6 rotate-45" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Estado Actual en Embudo</label>
                                    <select
                                        name="status"
                                        value={editingService.status}
                                        onChange={(e) => setEditingService({ ...editingService, status: e.target.value })}
                                        className="input-field w-full bg-white"
                                        required
                                    >
                                        <option value="BACKLOG">Backlog</option>
                                        <option value="INSTALLED">Instalado</option>
                                        <option value="PROSPECTING">Prospección</option>
                                        <option value="CONTACTED">Contactado</option>
                                        <option value="FIRST_MEETING">Primera Cita</option>
                                        <option value="OFFERED">Ofertado</option>
                                        <option value="FOLLOW_UP">Seguimiento</option>
                                        <option value="CLOSING_MEETING">Cita de Cierre</option>
                                        <option value="DEMO">Demo</option>
                                        <option value="CONTRACT_SIGNED">Firma de Contrato</option>
                                        <option value="LOST">Negocio Perdido</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Monto MRC ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="agreed_price"
                                            value={editingService.agreed_price}
                                            onChange={(e) => setEditingService({ ...editingService, agreed_price: e.target.value })}
                                            className="input-field w-full"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Monto NRC ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="nrc"
                                            value={editingService.nrc || ''}
                                            onChange={(e) => setEditingService({ ...editingService, nrc: e.target.value })}
                                            className="input-field w-full"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Velocidad (Mbps)</label>
                                        <input
                                            type="text"
                                            name="bandwidth"
                                            value={editingService.bandwidth || ''}
                                            onChange={(e) => setEditingService({ ...editingService, bandwidth: e.target.value })}
                                            className="input-field w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Ubicación</label>
                                        <input
                                            type="text"
                                            name="service_location"
                                            value={editingService.service_location || ''}
                                            onChange={(e) => setEditingService({ ...editingService, service_location: e.target.value })}
                                            className="input-field w-full"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Historial de Observaciones</label>
                                    <div className="mb-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-[11px] text-slate-600 max-h-32 overflow-y-auto whitespace-pre-wrap shadow-inner">
                                        {editingService.notes || "No hay notas previas en el sistema."}
                                    </div>
                                    <textarea
                                        value={editingService.new_note || ''}
                                        onChange={(e) => setEditingService({ ...editingService, new_note: e.target.value })}
                                        className="input-field w-full border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                                        rows={3}
                                        placeholder="Agrega una nueva nota que se guardará con fecha y hora..."
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
