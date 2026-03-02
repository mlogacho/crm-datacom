import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Building2, Smartphone, MonitorSmartphone, Trash2, Upload, ClipboardList } from 'lucide-react';
import axios from 'axios';

export default function ClientsList() {
    const [clients, setClients] = useState([]);

    // Filtros combinados
    const [filters, setFilters] = useState({
        search: '',
        type: '',
        status: '',
        region: '',
        segment: '',
        account_manager: ''
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [editingClient, setEditingClient] = useState(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusClient, setStatusClient] = useState(null);
    const [statusFormData, setStatusFormData] = useState({ state: 'FIRST_MEETING', reason: '', evidence: null, nrc: '', mrc: '', custom_date: '' });

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyClient, setHistoryClient] = useState(null);

    // Form state (usado para Nuevo y para Editar)
    const initialFormState = {
        name: '',
        legal_name: '',
        tax_id_type: 'RUC',
        tax_id: '',
        type: 'HOUSING',
        email: '',
        phone: '',
        address: '',
        region: '',
        city: '',
        segment: '',
        account_manager: '',
        is_active: true,
        classification: 'PROSPECT'
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await axios.get('/api/clients/clients/');
            const dataList = response.data.results ? response.data.results : response.data;
            const mappedClients = dataList.map(client => ({
                id: client.id,
                name: client.name,
                legal_name: client.legal_name,
                tax_id: client.tax_id,
                type: client.client_type,
                classification: client.classification,
                prospect_status: client.prospect_status,
                status: client.is_active ? 'Activo' : 'Inactivo',
                is_active: client.is_active,
                email: client.email,
                phone: client.phone,
                address: client.address,
                region: client.region || '',
                city: client.city || '',
                segment: client.segment || '',
                account_manager: client.account_manager || ''
            }));
            setClients(mappedClients);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const isNumeric = /^\d+$/.test(formData.tax_id);
        if (!isNumeric && formData.tax_id_type !== 'OTRO') {
            alert('El documento de identidad debe contener solo números si es RUC o Cédula.');
            return;
        }

        try {
            const payload = {
                ...formData,
                client_type: formData.type,
                name: formData.name.trim() === '' ? formData.legal_name : formData.name
            };
            delete payload.type;
            delete payload.tax_id_type;

            await axios.post('/api/clients/clients/', payload);
            fetchClients();
            setIsModalOpen(false);
            setFormData(initialFormState);
            alert('¡Cliente registrado exitosamente!');
        } catch (error) {
            console.error('Error creating client:', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            alert(`Error al crear el cliente: ${errorMsg}`);
        }
    };

    const openEditModal = (client) => {
        setEditingClient(client);
        setFormData({
            ...initialFormState,
            name: client.name,
            legal_name: client.legal_name || '',
            tax_id_type: 'RUC', // fallback genérico
            tax_id: client.tax_id,
            type: client.type,
            email: client.email,
            phone: client.phone || '',
            address: client.address || '',
            region: client.region || '',
            city: client.city || '',
            segment: client.segment || '',
            account_manager: client.account_manager || '',
            is_active: client.is_active,
            classification: client.classification || 'PROSPECT'
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                client_type: formData.type,
                name: formData.name.trim() === '' ? formData.legal_name : formData.name
            };
            delete payload.type;
            delete payload.tax_id_type;

            await axios.patch(`/api/clients/clients/${editingClient.id}/`, payload);
            fetchClients();
            setIsEditModalOpen(false);
            setEditingClient(null);
            setFormData(initialFormState);
            alert('¡Cliente actualizado exitosamente!');
        } catch (error) {
            console.error('Error updating client:', error);
            alert('Error al actualizar el cliente.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro que deseas eliminar permanentemente este cliente?')) {
            try {
                await axios.delete(`/api/clients/clients/${id}/`);
                setClients(clients.filter(client => client.id !== id));
            } catch (error) {
                console.error('Error deleting client:', error);
                alert('Error al eliminar el cliente.');
            }
        }
    };

    const handleStatusFormChange = (e) => {
        const { name, value, files } = e.target;
        setStatusFormData(prev => ({
            ...prev,
            [name]: files ? files[0] : value
        }));
    };

    const handleStatusSubmit = async (e) => {
        e.preventDefault();

        if (statusFormData.state === 'OFFERED') {
            if (!statusFormData.nrc && !statusFormData.mrc) {
                alert('Al seleccionar el estado "OFERTADO", debes ingresar obligatoriamente al menos el valor de NRC o MRC.');
                return;
            }
        }

        const data = new FormData();
        data.append('status', statusFormData.state);
        data.append('reason', statusFormData.reason);
        if (statusFormData.evidence) {
            data.append('evidence', statusFormData.evidence);
        }
        if (statusFormData.custom_date) {
            data.append('custom_date', statusFormData.custom_date);
        }
        if (statusFormData.state === 'OFFERED') {
            if (statusFormData.nrc) data.append('nrc', statusFormData.nrc);
            if (statusFormData.mrc) data.append('mrc', statusFormData.mrc);
        }

        try {
            await axios.post(`/api/clients/clients/${statusClient.id}/update_prospect_status/`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchClients();
            setIsStatusModalOpen(false);
            setStatusClient(null);
            setStatusFormData({ state: 'FIRST_MEETING', reason: '', evidence: null, nrc: '', mrc: '', custom_date: '' });
            alert('¡Estado de prospecto actualizado!');
        } catch (error) {
            console.error('Error updating prospect status:', error);
            alert('Error al actualizar el estado de prospecto.');
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            alert("Por favor selecciona un archivo CSV.");
            return;
        }

        const importFormData = new FormData();
        importFormData.append('file', importFile);

        try {
            const response = await axios.post('/api/clients/import/', importFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            fetchClients();
            setIsImportModalOpen(false);
            setImportFile(null);
            alert(`¡Importación exitosa!\nClientes procesados/creados: ${response.data.clients_imported}\nServicios migrados: ${response.data.services_imported}`);
        } catch (error) {
            console.error('Error importing clients:', error);
            const errorMsg = error.response?.data?.error ? error.response.data.error : error.message;
            alert(`Error durante la importación: ${errorMsg}`);
        }
    };

    const getClientIcon = (type) => {
        switch (type) {
            case 'HOUSING': return <Building2 className="w-5 h-5 text-blue-500" />;
            case 'TELECOM': return <Smartphone className="w-5 h-5 text-emerald-500" />;
            case 'APP_DEV': return <MonitorSmartphone className="w-5 h-5 text-purple-500" />;
            default: return <Building2 className="w-5 h-5 text-slate-500" />;
        }
    };

    const getStatusBadge = (status) => {
        const isActivo = status === 'Activo';
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActivo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {status}
            </span>
        );
    };

    // Extraer valores únicos para los dropdowns de filtros
    const uniqueRegions = [...new Set(clients.map(c => c.region).filter(Boolean))];
    const uniqueSegments = [...new Set(clients.map(c => c.segment).filter(Boolean))];
    const uniqueManagers = [...new Set(clients.map(c => c.account_manager).filter(Boolean))];

    const filteredClients = clients.filter(client => {
        const matchSearch = String(client.name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(client.legal_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(client.email || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(client.tax_id || '').includes(filters.search);

        const matchType = filters.type === '' || client.type === filters.type;
        const matchStatus = filters.status === '' || client.status === filters.status;
        const matchRegion = filters.region === '' || client.region === filters.region;
        const matchSegment = filters.segment === '' || client.segment === filters.segment;
        const matchManager = filters.account_manager === '' || client.account_manager === filters.account_manager;

        return matchSearch && matchType && matchStatus && matchRegion && matchSegment && matchManager;
    });

    const FormFields = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold leading-6 text-slate-900 mb-2">Clasificación del Cliente <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="classification" value="PROSPECT" checked={formData.classification === 'PROSPECT'} onChange={handleInputChange} className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500" />
                        <span className="text-sm font-medium text-slate-700">Prospecto</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="classification" value="ACTIVE" checked={formData.classification === 'ACTIVE'} onChange={handleInputChange} className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500" />
                        <span className="text-sm font-medium text-slate-700">Cliente Activo</span>
                    </label>
                </div>
            </div>

            <div className="space-y-4 md:col-span-2 mt-2">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Información Fiscal</h4>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Documento <span className="text-red-500">*</span></label>
                <div className="mt-1 flex gap-2">
                    <select name="tax_id_type" value={formData.tax_id_type} onChange={handleInputChange} className="input-field bg-white w-1/3">
                        <option value="RUC">RUC</option>
                        <option value="CEDULA">Cédula</option>
                        <option value="OTRO">Otro</option>
                    </select>
                    <input type="text" name="tax_id" required value={formData.tax_id} onChange={handleInputChange} className="input-field w-2/3" placeholder="ID" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Tipo de Cliente <span className="text-red-500">*</span></label>
                <div className="mt-1">
                    <select name="type" value={formData.type} onChange={handleInputChange} className="input-field bg-white">
                        <option value="HOUSING">Housing / Colocation</option>
                        <option value="TELECOM">Telecomunicaciones</option>
                        <option value="APP_DEV">Desarrollo de Apps</option>
                        <option value="OTHER">Otro</option>
                    </select>
                </div>
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium leading-6 text-slate-900">Razón Social <span className="text-red-500">*</span></label>
                <input type="text" name="legal_name" required value={formData.legal_name} onChange={handleInputChange} className="mt-1 input-field" placeholder="Nombre legal de la compañía" />
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium leading-6 text-slate-900">Nombre Comercial</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 input-field" placeholder="Nombre con el que se le conoce" />
            </div>

            <div className="space-y-4 md:col-span-2 mt-2">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Datos Operativos (Migración)</h4>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Región</label>
                <input type="text" name="region" value={formData.region} onChange={handleInputChange} className="mt-1 input-field" placeholder="Ej. R1, R2, Costa, Sierra" />
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Ciudad</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="mt-1 input-field" placeholder="Ej. Quito, Guayaquil" />
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Segmento</label>
                <input type="text" name="segment" value={formData.segment} onChange={handleInputChange} className="mt-1 input-field" placeholder="Ej. BANCA, PETRÓLEO, GOBIERNO" />
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Gerente de Cuenta</label>
                <input type="text" name="account_manager" value={formData.account_manager} onChange={handleInputChange} className="mt-1 input-field" placeholder="Nombre del Asignado" />
            </div>

            <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-2">
                <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-900">Cliente Activo en el Sistema</label>
            </div>

            <div className="space-y-4 md:col-span-2 mt-2">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Contacto Básico</h4>
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Correo Electrónico <span className="text-red-500">*</span></label>
                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="mt-1 input-field" placeholder="contacto@empresa.com" />
            </div>

            <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">Teléfonos</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 input-field" placeholder="Varios números separados por coma" />
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium leading-6 text-slate-900">Dirección Física</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="mt-1 input-field" placeholder="Dirección completa" />
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">Directorio de Clientes</h1>
                    <p className="mt-2 text-sm text-slate-600">Gestiona toda la cartera de clientes de DATACOM S.A.</p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-3">
                    <button
                        className="btn-outline flex items-center gap-2"
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        <Upload className="w-4 h-4" />
                        <span>Migrar Excel/CSV</span>
                    </button>
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => {
                            setFormData(initialFormState);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            <div className="card mb-6">
                {/* Filtros Avanzados Bar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Buscar (Nombre, Correo, RUC)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    name="search"
                                    className="input-field pl-9 text-sm py-2"
                                    placeholder="Buscar clientes..."
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo</label>
                            <select name="type" value={filters.type} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                <option value="HOUSING">Housing</option>
                                <option value="TELECOM">Telecom</option>
                                <option value="APP_DEV">App Dev</option>
                                <option value="OTHER">Otro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Estado</label>
                            <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                <option value="Activo">Activos</option>
                                <option value="Inactivo">Inactivos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Segmento</label>
                            <select name="segment" value={filters.segment} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                {uniqueSegments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Gerente de Cuenta</label>
                            <select name="account_manager" value={filters.account_manager} onChange={handleFilterChange} className="input-field bg-white text-sm py-2 px-3">
                                <option value="">Todos</option>
                                {uniqueManagers.map(mgr => <option key={mgr} value={mgr}>{mgr}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo & Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Detalles Operativos</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto Principal</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                                                {getClientIcon(client.type)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-slate-900">{client.name}</div>
                                                <div className="text-xs text-slate-500">{client.legal_name || client.tax_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900 mb-1">{client.type}</div>
                                        <div className="flex flex-col gap-1 items-start">
                                            {getStatusBadge(client.status)}
                                            {client.classification === 'PROSPECT' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                    Prospecto: <span className="ml-1 font-bold">{client.prospect_status || 'NUEVO'}</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                    Cliente Activo
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900"><span className="font-semibold text-slate-500">G:</span> {client.account_manager || 'N/A'}</div>
                                        <div className="text-xs text-slate-500 mt-1">{client.region} {client.region && client.city ? '-' : ''} {client.city}</div>
                                        <div className="text-xs text-slate-500">{client.segment}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900">{client.email}</div>
                                        <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">{client.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            {client.classification === 'PROSPECT' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const now = new Date();
                                                            const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                                                            setStatusClient(client);
                                                            setStatusFormData(prev => ({ ...prev, custom_date: localDateTime }));
                                                            setIsStatusModalOpen(true);
                                                        }}
                                                        className="text-amber-500 hover:text-amber-600 transition-colors"
                                                        title="Gestionar Estado de Prospecto"
                                                    >
                                                        <ClipboardList className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setHistoryClient(client);
                                                            setIsHistoryModalOpen(true);
                                                        }}
                                                        className="text-indigo-500 hover:text-indigo-600 transition-colors"
                                                        title="Ver Historial de Prospecto"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => openEditModal(client)}
                                                className="text-slate-400 hover:text-blue-500 transition-colors"
                                                title="Editar Cliente"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                title="Eliminar Cliente"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">
                                        No se encontraron clientes que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700">
                                Mostrando <span className="font-medium">{filteredClients.length > 0 ? 1 : 0}</span> a <span className="font-medium">{filteredClients.length}</span> de <span className="font-medium">{filteredClients.length}</span> resultados filtrados
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Nuevo Cliente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-y-auto max-h-[90vh] animate-slide-up">
                        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Registrar Nuevo Cliente</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <FormFields />

                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary space-x-2">
                                    <Plus className="w-4 h-4 inline" />
                                    <span>Registrar Cliente</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Editar Cliente */}
            {isEditModalOpen && editingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-y-auto max-h-[90vh] animate-slide-up">
                        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Actualizar Expediente del Cliente</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6">
                            <FormFields />

                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary space-x-2 text-white bg-blue-600 hover:bg-blue-700">
                                    <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Guardar Cambios</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Importación CSV */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsImportModalOpen(false)}></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Migrar Base de Datos Actual (CSV)</h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleImportSubmit} className="p-6">
                            <div className="mb-6">
                                <p className="text-sm text-slate-600 mb-4">
                                    Asegúrese de exportar su archivo de Excel (`.xlsx`) a formato <strong>Valores separados por comas (.csv)</strong>.
                                    El archivo debe contener las cabeceras exactas (REGION, CIUDAD, CLIENTE, SEGMENTO, ESTADO...).
                                </p>
                                <label className="block text-sm font-medium leading-6 text-slate-900">Seleccionar Archivo .CSV</label>
                                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10 hover:border-primary-500 transition-colors bg-slate-50">
                                    <div className="text-center">
                                        <Upload className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
                                        <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 hover:text-primary-500">
                                                <span>Subir un archivo</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={(e) => setImportFile(e.target.files[0])} />
                                            </label>
                                        </div>
                                        <p className="text-xs leading-5 text-slate-500 mt-2">
                                            {importFile ? importFile.name : 'Solo archivos .csv'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-x-4">
                                <button type="button" onClick={() => setIsImportModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary flex items-center gap-2" disabled={!importFile}>
                                    <Upload className="w-4 h-4" />
                                    Iniciar Migración
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Estado de Prospecto */}
            {isStatusModalOpen && statusClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsStatusModalOpen(false)}></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-amber-900">Actualizar Estado: {statusClient.name}</h3>
                            <button onClick={() => setIsStatusModalOpen(false)} className="text-amber-400 hover:text-amber-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleStatusSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Fecha y Hora de la Acción <span className="text-red-500">*</span></label>
                                    <input type="datetime-local" name="custom_date" value={statusFormData.custom_date} onChange={handleStatusFormChange} required className="mt-1 input-field" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Nuevo Estado de Prospecto <span className="text-red-500">*</span></label>
                                    <select name="state" value={statusFormData.state} onChange={handleStatusFormChange} required className="mt-1 input-field bg-white">
                                        <option value="FIRST_MEETING">Primera Cita</option>
                                        <option value="CONTACTED">Contactado</option>
                                        <option value="OFFERED">Ofertado</option>
                                        <option value="FOLLOW_UP">Seguimiento</option>
                                        <option value="CLOSING_MEETING">Cita Cierre</option>
                                        <option value="ADJUDICATED">Adjudicado</option>
                                        <option value="TDR_ELABORATION">Elaboración de TDR</option>
                                        <option value="LOST_DEAL">Negocio Perdido</option>
                                    </select>
                                </div>

                                {statusFormData.state === 'OFFERED' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                        <div className="md:col-span-2">
                                            <p className="text-xs font-semibold text-blue-800 mb-2">Ingresa al menos uno de los valores financieros para la oferta:</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium leading-6 text-slate-900">NRC ($)</label>
                                            <input type="number" step="0.01" min="0" name="nrc" value={statusFormData.nrc} onChange={handleStatusFormChange} className="mt-1 input-field" placeholder="0.00" />
                                            <p className="text-[10px] text-slate-500 mt-1">Non Recurring Charge</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium leading-6 text-slate-900">MRC ($)</label>
                                            <input type="number" step="0.01" min="0" name="mrc" value={statusFormData.mrc} onChange={handleStatusFormChange} className="mt-1 input-field" placeholder="0.00" />
                                            <p className="text-[10px] text-slate-500 mt-1">Monthly Recurring Charge</p>
                                        </div>
                                        {statusFormData.mrc && (
                                            <div className="md:col-span-2 mt-2 p-3 bg-white border border-slate-200 rounded text-center">
                                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Valor Anual Proyectado (MRC x 12):</span>
                                                <div className="text-lg font-bold text-emerald-600 mt-1">
                                                    ${(parseFloat(statusFormData.mrc) * 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Razón / Comentarios <span className="text-red-500">*</span></label>
                                    <textarea name="reason" value={statusFormData.reason} onChange={handleStatusFormChange} required rows="3" className="mt-1 input-field" placeholder="Describe la razón de este cambio de estado..."></textarea>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-900">Evidencia (Opcional)</label>
                                    <input type="file" name="evidence" onChange={handleStatusFormChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-6">
                                <button type="button" onClick={() => setIsStatusModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary bg-amber-600 hover:bg-amber-700 text-white">
                                    Guardar Estado
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Historial de Prospecto */}
            {isHistoryModalOpen && historyClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryModalOpen(false)}></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh] animate-slide-up">
                        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-200 bg-indigo-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-indigo-900">Historial de Estados: {historyClient.name}</h3>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-indigo-400 hover:text-indigo-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6">
                            {historyClient.status_history && historyClient.status_history.length > 0 ? (
                                <div className="space-y-6">
                                    {historyClient.status_history.map((record, index) => (
                                        <div key={index} className="relative pl-6 pb-6 border-l-2 border-indigo-200 last:border-0 last:pb-0">
                                            <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1 ring-4 ring-white"></div>
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                                                        {record.status}
                                                    </span>
                                                    <div className="text-right">
                                                        <div className="text-xs font-semibold text-slate-800" title="Fecha Registrada (Custom)">
                                                            Ocurrido: {new Date(record.custom_date || record.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5" title="Fecha del Sistema (Creación)">
                                                            Registrado: {new Date(record.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-slate-700 mt-2">{record.reason}</p>

                                                {(record.nrc || record.mrc) && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-4">
                                                        {record.nrc && <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded">NRC: ${record.nrc}</span>}
                                                        {record.mrc && <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">MRC: ${record.mrc}</span>}
                                                        {record.mrc && <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded">Anual: ${(parseFloat(record.mrc) * 12).toFixed(2)}</span>}
                                                    </div>
                                                )}

                                                {record.evidence && (
                                                    <div className="mt-3">
                                                        <a href={record.evidence} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                                            </svg>
                                                            Ver Evidencia Adjunta
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-500">No hay historial de estados registrado para este cliente.</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button onClick={() => setIsHistoryModalOpen(false)} className="btn-primary">
                                Cerrar Historial
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
