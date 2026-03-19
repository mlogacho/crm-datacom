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
    const [isUpdateServiceModalOpen, setIsUpdateServiceModalOpen] = useState(false);
    const [updateServiceFormData, setUpdateServiceFormData] = useState({
        status: '', agreed_price: '', nrc: '', bandwidth: '',
        service_location: '', notes: '', new_note: ''
    });
    const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
    const [workOrderFormData, setWorkOrderFormData] = useState({
        order_number: '', client_name: '', service_name: '',
        service_location: '', login: '', estimated_date: '', observations: ''
    });
    const [editingService, setEditingService] = useState(null);

    // Form state (edit modal)
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

    // Assign-service modal (two-panel, same as Gestionar Servicios in ClientsList)
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientServicesList, setClientServicesList] = useState([]);
    const [newServiceFormData, setNewServiceFormData] = useState({
        service: '',
        agreed_price: '',
        nrc: '',
        start_date: new Date().toISOString().split('T')[0],
        status: 'PROSPECTING',
        bandwidth: '',
        service_location: '',
        notes: ''
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

    const fetchClientServices = async (clientId) => {
        if (!clientId) { setClientServicesList([]); return; }
        try {
            const res = await axios.get(`/api/services/client-services/?client=${clientId}`);
            setClientServicesList(res.data.results || res.data);
        } catch (error) {
            console.error('Error fetching client services:', error);
        }
    };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClientId) { alert('Selecciona un cliente.'); return; }
        try {
            await axios.post('/api/services/client-services/', {
                client: selectedClientId,
                service: newServiceFormData.service,
                agreed_price: newServiceFormData.agreed_price,
                nrc: newServiceFormData.nrc || 0,
                start_date: newServiceFormData.start_date,
                status: newServiceFormData.status,
                bandwidth: newServiceFormData.bandwidth,
                service_location: newServiceFormData.service_location,
                notes: newServiceFormData.notes
            });
            setNewServiceFormData({
                service: '',
                agreed_price: '',
                nrc: '',
                start_date: new Date().toISOString().split('T')[0],
                status: 'PROSPECTING',
                bandwidth: '',
                service_location: '',
                notes: ''
            });
            fetchClientServices(selectedClientId);
            fetchAssignedServices();
            alert('Servicio asociado correctamente.');
        } catch (error) {
            console.error('Error adding service:', error);
            alert('Error al asociar el servicio.');
        }
    };

    const deleteClientService = async (serviceId) => {
        if (window.confirm('¿Seguro que deseas desvincular este servicio del cliente?')) {
            try {
                await axios.delete(`/api/services/client-services/${serviceId}/`);
                fetchClientServices(selectedClientId);
                fetchAssignedServices();
            } catch (error) {
                console.error('Error deleting client service:', error);
                alert('Error al eliminar la vinculación.');
            }
        }
    };

    const handleEditClick = (service) => {
        setEditingService({ ...service });
        setUpdateServiceFormData({
            status: service.status || '',
            agreed_price: service.agreed_price || '',
            nrc: service.nrc || '',
            bandwidth: service.bandwidth || '',
            service_location: service.service_location || '',
            notes: service.notes || '',
            new_note: ''
        });
        setIsUpdateServiceModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const now = new Date();
            const timestamp = now.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
            let updatedNotes = updateServiceFormData.notes || '';
            if (updateServiceFormData.new_note && updateServiceFormData.new_note.trim() !== '') {
                const separator = updatedNotes ? '\n---\n' : '';
                updatedNotes = `${updatedNotes}${separator}[${timestamp}]: ${updateServiceFormData.new_note}`;
            }

            const payload = {
                status: updateServiceFormData.status,
                agreed_price: updateServiceFormData.agreed_price,
                nrc: updateServiceFormData.nrc || 0,
                bandwidth: updateServiceFormData.bandwidth,
                service_location: updateServiceFormData.service_location,
                notes: updatedNotes
            };

            await axios.patch(`/api/services/client-services/${editingService.id}/`, payload);
            fetchAssignedServices();

            if (updateServiceFormData.status === 'BACKLOG') {
                try {
                    const seqRes = await axios.get('/api/services/work-orders/next_sequence/');
                    const { next_order_number, next_login_sequence } = seqRes.data;

                    const clientObj = clients.find(c => c.id === editingService.client);
                    const clientName = clientObj ? clientObj.name : 'Cliente';
                    const clientInitials = clientName
                        .split(' ')
                        .filter(w => w.length > 0)
                        .map(w => w[0])
                        .join('')
                        .toUpperCase();

                    const location = updateServiceFormData.service_location || 'SIN_UBICACION';
                    const catalogItem = catalogs.find(s => s.id === editingService.service);
                    const serviceName = catalogItem ? catalogItem.name : 'SERV';
                    const formattedLogin = `${clientInitials}_${location.replace(/\s+/g, '_')}_${serviceName.replace(/\s+/g, '_')}_${next_login_sequence}`;

                    setWorkOrderFormData({
                        order_number: `Orden de Instalacion #${next_order_number}`,
                        client_name: clientName,
                        service_name: serviceName,
                        service_location: updateServiceFormData.service_location,
                        login: formattedLogin,
                        estimated_date: editingService.work_order ? (editingService.work_order.estimated_date || '').slice(0, 16) : '',
                        observations: editingService.work_order ? (editingService.work_order.observations || '') : ''
                    });

                    setIsUpdateServiceModalOpen(false);
                    setIsWorkOrderModalOpen(true);
                } catch (err) {
                    console.error('Error preparing Work Order:', err);
                    alert('Error al preparar la Orden de Trabajo.');
                }
            } else {
                setIsUpdateServiceModalOpen(false);
                alert('Servicio actualizado exitosamente.');
            }
        } catch (error) {
            console.error('Error updating service:', error);
            alert('Error al actualizar el servicio.');
        }
    };

    const handleWorkOrderSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                client_service: editingService.id,
                order_number: workOrderFormData.order_number,
                login: workOrderFormData.login,
                estimated_date: workOrderFormData.estimated_date,
                observations: workOrderFormData.observations
            };
            await axios.post('/api/services/work-orders/', payload);
            fetchAssignedServices();
            setIsWorkOrderModalOpen(false);
            setIsUpdateServiceModalOpen(false);
            alert('Orden de Trabajo guardada con exito.');
        } catch (error) {
            console.error('Error saving work order:', error);
            alert('Error al guardar la Orden de Trabajo.');
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
            {/* Modal Asignar Servicio — dos paneles con selector de cliente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-slide-up">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900">Asignar Servicio</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex divide-x divide-slate-200 max-h-[75vh]">
                            {/* Left panel — new service form */}
                            <div className="w-1/2 p-6 overflow-y-auto">
                                <h3 className="text-sm font-bold text-primary-600 flex items-center gap-2 mb-4">
                                    <Plus className="w-5 h-5" /> Vincular Nuevo Servicio
                                </h3>

                                {/* Client selector */}
                                <div className="mb-4">
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Cliente <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={selectedClientId}
                                        onChange={(e) => {
                                            setSelectedClientId(e.target.value);
                                            fetchClientServices(e.target.value);
                                        }}
                                        className="input-field bg-white w-full"
                                    >
                                        <option value="">-- Seleccionar cliente --</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <form onSubmit={handleServiceSubmit} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Servicio <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={newServiceFormData.service}
                                            onChange={(e) => setNewServiceFormData(prev => ({ ...prev, service: e.target.value }))}
                                            className="input-field bg-white w-full"
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {catalogs.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.internal_code ? `[${s.internal_code}] ` : ''}{s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">MRC ($) <span className="text-red-500">*</span></label>
                                            <input
                                                required type="number" step="0.01" placeholder="0.00"
                                                value={newServiceFormData.agreed_price}
                                                onChange={(e) => setNewServiceFormData(prev => ({ ...prev, agreed_price: e.target.value }))}
                                                className="input-field w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">NRC ($)</label>
                                            <input
                                                type="number" step="0.01" placeholder="0.00"
                                                value={newServiceFormData.nrc}
                                                onChange={(e) => setNewServiceFormData(prev => ({ ...prev, nrc: e.target.value }))}
                                                className="input-field w-full"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Estado Inicial <span className="text-red-500">*</span></label>
                                        <select
                                            value={newServiceFormData.status}
                                            onChange={(e) => setNewServiceFormData(prev => ({ ...prev, status: e.target.value }))}
                                            className="input-field bg-white w-full"
                                        >
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

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Velocidad (Mbps)</label>
                                            <input
                                                type="text" placeholder="e.g. 50"
                                                value={newServiceFormData.bandwidth}
                                                onChange={(e) => setNewServiceFormData(prev => ({ ...prev, bandwidth: e.target.value }))}
                                                className="input-field w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Ubicación del Servicio</label>
                                            <input
                                                type="text" placeholder="Dirección..."
                                                value={newServiceFormData.service_location}
                                                onChange={(e) => setNewServiceFormData(prev => ({ ...prev, service_location: e.target.value }))}
                                                className="input-field w-full"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Observaciones</label>
                                        <textarea
                                            rows={2} placeholder="Notas adicionales..."
                                            value={newServiceFormData.notes}
                                            onChange={(e) => setNewServiceFormData(prev => ({ ...prev, notes: e.target.value }))}
                                            className="input-field w-full"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full btn-primary mt-2"
                                    >
                                        Vincular Servicio
                                    </button>
                                </form>
                            </div>

                            {/* Right panel — current services for selected client */}
                            <div className="w-1/2 p-6 overflow-y-auto bg-slate-50">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                                    <Server className="w-4 h-4 text-indigo-500" /> Servicios Actuales
                                </h3>

                                {!selectedClientId ? (
                                    <p className="text-xs text-slate-400 text-center mt-8">Selecciona un cliente para ver sus servicios.</p>
                                ) : clientServicesList.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center mt-8">Este cliente no tiene servicios vinculados.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {clientServicesList.map(item => {
                                            const catalogItem = catalogs.find(c => c.id === item.service);
                                            return (
                                                <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{catalogItem?.name || item.service_name || 'Servicio'}</p>
                                                        <p className="text-xs text-slate-500">
                                                            MRC: <span className="font-semibold">${parseFloat(item.agreed_price || 0).toFixed(2)}</span>
                                                            {' · '}Estado: <span className="font-semibold">{translateStatus(item.status)}</span>
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteClientService(item.id)}
                                                        className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                                                        title="Desvincular servicio"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-3 bg-white border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedClientId('');
                                    setClientServicesList([]);
                                }}
                                className="btn-secondary text-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de EDICIÓN de Estado y Monto — v2.0 */}
            {
                isUpdateServiceModalOpen && editingService && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsUpdateServiceModalOpen(false)}></div>
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800">Actualizar Servicio v2.0</h3>
                                <button onClick={() => setIsUpdateServiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                                    <Plus className="w-6 h-6 rotate-45" />
                                </button>
                            </div>
                            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Estado Actual en Embudo</label>
                                    <select
                                        value={updateServiceFormData.status}
                                        onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, status: e.target.value })}
                                        className="input-field w-full bg-white"
                                        required
                                    >
                                        <option value="BACKLOG">Backlog</option>
                                        <option value="INSTALLED">Instalado</option>
                                        <option value="PROSPECTING">Prospeccion</option>
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
                                        <input type="number" step="0.01" value={updateServiceFormData.agreed_price}
                                            onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, agreed_price: e.target.value })}
                                            className="input-field w-full" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Monto NRC ($)</label>
                                        <input type="number" step="0.01" value={updateServiceFormData.nrc}
                                            onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, nrc: e.target.value })}
                                            className="input-field w-full" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Velocidad (Mbps)</label>
                                        <input type="text" value={updateServiceFormData.bandwidth}
                                            onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, bandwidth: e.target.value })}
                                            className="input-field w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Ubicacion</label>
                                        <input type="text" value={updateServiceFormData.service_location}
                                            onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, service_location: e.target.value })}
                                            className="input-field w-full" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Historial de Observaciones</label>
                                    <div className="mb-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-[11px] text-slate-600 max-h-32 overflow-y-auto whitespace-pre-wrap shadow-inner">
                                        {updateServiceFormData.notes || 'No hay notas previas en el sistema.'}
                                    </div>
                                    <textarea
                                        value={updateServiceFormData.new_note}
                                        onChange={e => setUpdateServiceFormData({ ...updateServiceFormData, new_note: e.target.value })}
                                        className="input-field w-full border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                                        rows={3}
                                        placeholder="Agrega una nueva nota que se guardara con fecha y hora..."
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setIsUpdateServiceModalOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">
                                        Cancelar
                                    </button>
                                    <button type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {isWorkOrderModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsWorkOrderModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{workOrderFormData.order_number}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Generacion de Orden de Trabajo</p>
                            </div>
                            <button onClick={() => setIsWorkOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleWorkOrderSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Cliente</label>
                                    <div className="p-3 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 border border-slate-100 italic">{workOrderFormData.client_name}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio</label>
                                    <div className="p-3 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 border border-slate-100">{workOrderFormData.service_name}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicacion del Servicio</label>
                                    <div className="p-3 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 border border-slate-100">{workOrderFormData.service_location || 'No especificada'}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Login / Usuario PPPoE</label>
                                    <input type="text" value={workOrderFormData.login}
                                        onChange={e => setWorkOrderFormData({ ...workOrderFormData, login: e.target.value })}
                                        className="input-field w-full font-mono text-sm" required />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Estimada de Instalacion</label>
                                <input type="datetime-local" value={workOrderFormData.estimated_date}
                                    onChange={e => setWorkOrderFormData({ ...workOrderFormData, estimated_date: e.target.value })}
                                    className="input-field w-full" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observaciones</label>
                                <textarea value={workOrderFormData.observations}
                                    onChange={e => setWorkOrderFormData({ ...workOrderFormData, observations: e.target.value })}
                                    className="input-field w-full" rows={3}
                                    placeholder="Notas tecnicas, equipo, accesos..."
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsWorkOrderModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">Cancelar</button>
                                <button type="submit"
                                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 uppercase tracking-wide">
                                    Guardar Orden de Trabajo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
}
