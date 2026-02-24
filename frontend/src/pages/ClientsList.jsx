import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Building2, Smartphone, MonitorSmartphone, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function ClientsList() {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await axios.get('/api/clients/clients/');
            const mappedClients = response.data.map(client => ({
                id: client.id,
                name: client.name,
                legal_name: client.legal_name,
                tax_id: client.tax_id,
                type: client.client_type,
                status: client.is_active ? 'Activo' : 'Inactivo',
                email: client.email,
                phone: client.phone,
                address: client.address
            }));
            setClients(mappedClients);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        legal_name: '',
        tax_id: '',
        type: 'HOUSING',
        email: '',
        phone: '',
        address: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                client_type: formData.type
            };
            delete payload.type;

            await axios.post('/api/clients/clients/', payload);
            fetchClients();
            setIsModalOpen(false);
            setFormData({ name: '', legal_name: '', tax_id: '', type: 'HOUSING', email: '', phone: '', address: '' });
        } catch (error) {
            console.error('Error creating client:', error);
            alert('Error al crear el cliente. Por favor, verifique los datos o si el RUC/NIT está duplicado.');
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

    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">Directorio de Clientes</h1>
                    <p className="mt-2 text-sm text-slate-600">Gestiona toda la cartera de clientes de DATACOM S.A.</p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Cliente</span>
                    </button>
                </div>
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
                            placeholder="Buscar clientes por nombre o correo..."
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto Principal</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {clients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                                                {getClientIcon(client.type)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-slate-900">{client.name}</div>
                                                <div className="text-sm text-slate-500">{client.legal_name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900">{client.type}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(client.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900">{client.email}</div>
                                        <div className="text-sm text-slate-500">{client.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                title="Eliminar Cliente"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700">
                                Mostrando <span className="font-medium">{clients.length > 0 ? 1 : 0}</span> a <span className="font-medium">{clients.length}</span> de <span className="font-medium">{clients.length}</span> resultados
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50">
                                    Anterior
                                </button>
                                <button className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-primary-600 hover:bg-slate-50">
                                    1
                                </button>
                                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50">
                                    Siguiente
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Nuevo Cliente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Registrar Nuevo Cliente</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cerrar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Datos Empresariales */}
                                <div className="space-y-4 md:col-span-2">
                                    <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Información Fiscal</h4>
                                </div>

                                <div>
                                    <label htmlFor="tax_id" className="block text-sm font-medium leading-6 text-slate-900">RUC / NIT <span className="text-red-500">*</span></label>
                                    <div className="mt-1">
                                        <input type="text" name="tax_id" id="tax_id" required value={formData.tax_id} onChange={handleInputChange} className="input-field" placeholder="Ej. 1790000000001" />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="type" className="block text-sm font-medium leading-6 text-slate-900">Categoría de Servicio <span className="text-red-500">*</span></label>
                                    <div className="mt-1">
                                        <select name="type" id="type" value={formData.type} onChange={handleInputChange} className="input-field bg-white">
                                            <option value="HOUSING">Housing / Colocation</option>
                                            <option value="TELECOM">Telecomunicaciones</option>
                                            <option value="APP_DEV">Desarrollo de Apps</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="legal_name" className="block text-sm font-medium leading-6 text-slate-900">Razón Social <span className="text-red-500">*</span></label>
                                    <div className="mt-1">
                                        <input type="text" name="legal_name" id="legal_name" required value={formData.legal_name} onChange={handleInputChange} className="input-field" placeholder="Nombre legal de la compañía" />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="name" className="block text-sm font-medium leading-6 text-slate-900">Nombre Comercial</label>
                                    <div className="mt-1">
                                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="input-field" placeholder="Nombre con el que se le conoce" />
                                    </div>
                                </div>

                                {/* Datos de Contacto */}
                                <div className="space-y-4 md:col-span-2 mt-4">
                                    <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Datos de Contacto</h4>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900">Correo Electrónico <span className="text-red-500">*</span></label>
                                    <div className="mt-1">
                                        <input type="email" name="email" id="email" required value={formData.email} onChange={handleInputChange} className="input-field" placeholder="contacto@empresa.com" />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium leading-6 text-slate-900">Teléfono</label>
                                    <div className="mt-1">
                                        <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} className="input-field" placeholder="+593 99 999 9999" />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium leading-6 text-slate-900">Dirección Física</label>
                                    <div className="mt-1">
                                        <input type="text" name="address" id="address" value={formData.address} onChange={handleInputChange} className="input-field" placeholder="Calle principal y secundaria, Ciudad" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-x-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    Registrar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
