import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Tag, DollarSign, Activity, Pencil, Trash2 } from 'lucide-react';

export default function ServiceCatalogList() {
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        internal_code: '',
        name: '',
        description: '',
        client_taxes: '',
        base_cost: '',
        base_price: ''
    });

    const SERVICE_TYPES = {
        'HOUSING': 'Housing/Colocation',
        'TELECOM': 'Telecom / Internet',
        'APP_DEV': 'Desarrollo de Software',
        'OTHER': 'Otros Servicios',
    };

    const fetchCatalog = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/services/catalog/');
            setServices(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching service catalog:", error);
            alert("No se pudo cargar el catálogo de servicios.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openAddModal = () => {
        setModalMode('add');
        setEditingId(null);
        setFormData({
            internal_code: '',
            name: '',
            description: '',
            client_taxes: '',
            base_cost: '',
            base_price: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (service) => {
        setModalMode('edit');
        setEditingId(service.id);
        setFormData({
            internal_code: service.internal_code || '',
            name: service.name,
            description: service.description || '',
            client_taxes: service.client_taxes || '',
            base_cost: service.base_cost,
            base_price: service.base_price
        });
        setIsModalOpen(true);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'add') {
                await axios.post('/api/services/catalog/', formData);
            } else {
                await axios.put(`/api/services/catalog/${editingId}/`, formData);
            }
            setIsModalOpen(false);
            fetchCatalog();
        } catch (error) {
            console.error("Error saving service:", error);
            alert("Error al guardar el servicio en el catálogo. Verifique los datos o la conexión.");
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar el servicio "${name}"? Esta acción no se puede deshacer.`)) {
            try {
                await axios.delete(`/api/services/catalog/${id}/`);
                fetchCatalog();
            } catch (error) {
                console.error("Error deleting service:", error);
                alert("Error al eliminar el servicio. Puede que esté asociado a clientes existentes u ocurrió un error de conexión.");
            }
        }
    };

    const filteredServices = services.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="animate-fade-in pb-10">
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">Catálogo de Servicios</h1>
                    <p className="mt-2 text-sm text-slate-600">Gestiona los tipos de servicios base y sus precios unitarios.</p>
                </div>
                <div className="mt-4 sm:mt-0 flex gap-3">
                    <button
                        onClick={openAddModal}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Servicio</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
                        className="input-field pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Cód. Referencia
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Servicio
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                                    Descripción
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                                    Impuestos
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Costo
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Precio
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200 relative">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-slate-500">
                                        Cargando catálogo...
                                    </td>
                                </tr>
                            ) : filteredServices.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-slate-500">
                                        <Activity className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                        <p>No se encontraron servicios.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredServices.map((service) => (
                                    <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {service.internal_code || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
                                                    <Tag className="h-5 w-5" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-slate-900">{service.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell max-w-xs truncate text-sm text-slate-500">
                                            {service.description || <span className="text-slate-400 italic">Sin descripción</span>}
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell max-w-xs truncate text-sm text-slate-500">
                                            {service.client_taxes || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-500">
                                            ${parseFloat(service.base_cost).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                                            ${parseFloat(service.base_price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(service)}
                                                    className="text-primary-600 hover:text-primary-900 bg-primary-50 hover:bg-primary-100 p-2 rounded-lg transition-colors inline-block"
                                                    title="Editar Servicio"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(service.id, service.name)}
                                                    className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors inline-block"
                                                    title="Eliminar Servicio"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for new/edit Service */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                {modalMode === 'add' ? (
                                    <><Plus className="w-5 h-5 text-primary-600" /> Nuevo Servicio</>
                                ) : (
                                    <><Pencil className="w-5 h-5 text-primary-600" /> Editar Servicio</>
                                )}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Código Referencia Interna</label>
                                    <input
                                        type="text"
                                        name="internal_code"
                                        value={formData.internal_code}
                                        onChange={handleInputChange}
                                        className="input-field w-full"
                                        placeholder="Ej. REF-001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Servicio *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="input-field w-full"
                                        placeholder="Ej. Internet Fibra 100Mbps"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                    <textarea
                                        name="description"
                                        rows="3"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="input-field w-full resize-none"
                                        placeholder="Características, SLA, etc."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Impuestos del Cliente</label>
                                    <input
                                        type="text"
                                        name="client_taxes"
                                        value={formData.client_taxes}
                                        onChange={handleInputChange}
                                        className="input-field w-full"
                                        placeholder="Ej. IVA 15%"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Costo ($)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <DollarSign className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                name="base_cost"
                                                required
                                                value={formData.base_cost}
                                                onChange={handleInputChange}
                                                className="input-field w-full pl-9"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Precio ($)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <DollarSign className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                name="base_price"
                                                required
                                                value={formData.base_price}
                                                onChange={handleInputChange}
                                                className="input-field w-full pl-9"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {modalMode === 'add' ? 'Guardar Servicio' : 'Actualizar Servicio v2.0'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
