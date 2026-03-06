import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Home,
    Users,
    Server,
    LifeBuoy,
    FileText,
    Settings,
    Menu,
    X,
    Bell,
    Search
} from 'lucide-react';

const allNavigation = [
    { id: 'dashboard', name: 'Dashboard', href: '/', icon: Home },
    { id: 'clients', name: 'Clientes', href: '/clients', icon: Users },
    { id: 'services', name: 'Servicios', href: '/services', icon: Server },
    { id: 'support', name: 'Soporte', href: '/support', icon: LifeBuoy },
    { id: 'billing', name: 'Facturación', href: '/billing', icon: FileText },
];

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { userPermissions, hasViewPermission, logout } = useAuth();

    // Global search
    const [globalSearch, setGlobalSearch] = useState('');

    const handleGlobalSearch = (e) => {
        if (e.key === 'Enter' && globalSearch.trim()) {
            navigate('/clients', { state: { globalSearch } });
            setGlobalSearch(''); // Optional clear after search
        }
    };

    // Filter navigation based on allowed views
    const navigation = allNavigation.filter(item => hasViewPermission(item.id));

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [userForm, setUserForm] = useState({
        id: null, username: '', first_name: '', last_name: '', password: '',
        profile: { cedula: '', cargo: '', role: '', birthdate: '', civil_status: '', photo: null }
    });

    const handleOpenProfile = async () => {
        if (!userPermissions?.id) return;
        try {
            const res = await axios.get(`/api/core/users/${userPermissions.id}/`);
            const u = res.data;
            setUserForm({
                id: u.id,
                username: u.username,
                first_name: u.first_name,
                last_name: u.last_name,
                password: '',
                profile: {
                    cedula: u.profile?.cedula || '',
                    cargo: u.profile?.cargo || '',
                    role: u.profile?.role || '',
                    role_name: u.profile?.role_name || '',
                    birthdate: u.profile?.birthdate || '',
                    civil_status: u.profile?.civil_status || '',
                    photo: null
                }
            });
            setIsProfileModalOpen(true);
        } catch (error) {
            console.error("Error fetching user profile", error);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        const submitData = { ...userForm };

        const formData = new FormData();
        formData.append('first_name', submitData.first_name);
        formData.append('last_name', submitData.last_name);
        if (submitData.password) formData.append('password', submitData.password);
        formData.append('profile.cedula', submitData.profile.cedula);
        formData.append('profile.birthdate', submitData.profile.birthdate);
        formData.append('profile.civil_status', submitData.profile.civil_status);
        if (submitData.profile.photo instanceof File) {
            formData.append('profile.photo', submitData.profile.photo);
        }

        try {
            await axios.put(`/api/core/users/${submitData.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setIsProfileModalOpen(false);
            window.location.reload();
        } catch (error) {
            alert("Error al actualizar el perfil.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-slate-900/80" onClick={() => setSidebarOpen(false)} />
                <div className="fixed inset-y-0 left-0 w-64 bg-brand-dark transition-transform flex flex-col pt-5 pb-4">
                    <div className="flex items-center justify-between px-4 mb-6">
                        <a href="https://datacom.ec/" target="_blank" rel="noopener noreferrer" className="block">
                            <img src="/datacom_logo.png" alt="DATACOM S.A. Logo" className="h-12 object-contain" />
                        </a>
                        <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <nav className="flex-1 px-3 space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        }`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-brand-dark">
                <div className="flex-1 flex flex-col min-h-0 pt-6 pb-4">
                    <div className="flex items-center px-6 mb-8 gap-2">
                        <a href="https://datacom.ec/" target="_blank" rel="noopener noreferrer" className="block w-full">
                            <img src="/datacom_logo.png" alt="DATACOM S.A. Logo" className="h-12 object-contain" />
                        </a>
                    </div>
                    <nav className="flex-1 px-4 space-y-1.5">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        }`}
                                >
                                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="p-4 border-t border-slate-800 space-y-2">
                    {hasViewPermission('settings') && (
                        <Link to="/settings" className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                            <Settings className="mr-3 h-5 w-5 text-slate-400" />
                            Configuración
                        </Link>
                    )}
                    <button
                        onClick={() => {
                            logout();
                            window.location.href = '/login';
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                        <svg className="mr-3 h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col lg:pl-64">
                {/* Top Navbar */}
                <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-slate-200">
                    <button
                        className="px-4 border-r border-slate-200 text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex-1 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <div className="flex-1 flex">
                            <div className="w-full flex md:ml-0 relative max-w-md">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Search className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="search"
                                    placeholder="Buscar clientes, servicios o facturas..."
                                    className="block w-full pl-10 pr-3 py-2 border-0 focus:ring-0 sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent"
                                    value={globalSearch}
                                    onChange={(e) => setGlobalSearch(e.target.value)}
                                    onKeyDown={handleGlobalSearch}
                                />
                            </div>
                        </div>
                        <div className="ml-4 flex items-center space-x-4 md:space-x-6">
                            {/* Profile */}
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:block text-right">
                                    <div className="text-sm font-medium text-slate-900 capitalize cursor-pointer hover:text-primary-600" onClick={handleOpenProfile}>
                                        {userPermissions?.full_name || 'Usuario'}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {userPermissions?.is_superuser ? 'Súper Admin' : (userPermissions?.role || 'Sin Rol')}
                                    </div>
                                </div>
                                <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200 uppercase cursor-pointer hover:ring-2 ring-primary-300 overflow-hidden" onClick={handleOpenProfile}>
                                    {userPermissions?.photo ? (
                                        <img src={userPermissions.photo} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        userPermissions?.full_name ? userPermissions.full_name.substring(0, 2) : (userPermissions?.is_superuser ? 'AD' : 'US')
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="flex-1">
                    <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* PROFILE MODAL FOR CURRENT USER */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">Editar Persona / Usuario</h3>
                            <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleProfileSubmit} className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm text-slate-800 border-b pb-1">Credenciales de Acceso</h4>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Usuario *</label>
                                        <input type="text" value={userForm.username} disabled className="input-field w-full text-sm bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Contraseña <span className="text-slate-400 font-normal">(Dejar en blanco para no cambiar)</span>
                                        </label>
                                        <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="input-field w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Rol Asignado *</label>
                                        <input type="text" value={userForm.profile.role_name || (userPermissions?.is_superuser ? 'Súper Admin' : 'Sin Rol')} disabled className="input-field w-full text-sm bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm text-slate-800 border-b pb-1">Datos de la Persona</h4>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Nombres *</label>
                                        <input type="text" required value={userForm.first_name} onChange={e => setUserForm({ ...userForm, first_name: e.target.value })} className="input-field w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos *</label>
                                        <input type="text" required value={userForm.last_name} onChange={e => setUserForm({ ...userForm, last_name: e.target.value })} className="input-field w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Número de Cédula *</label>
                                        <input type="text" required value={userForm.profile.cedula} onChange={e => setUserForm({ ...userForm, profile: { ...userForm.profile, cedula: e.target.value } })} className="input-field w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Cargo *</label>
                                        <input type="text" disabled value={userForm.profile.cargo} className="input-field w-full text-sm bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
                                        <input type="date" value={userForm.profile.birthdate} onChange={e => setUserForm({ ...userForm, profile: { ...userForm.profile, birthdate: e.target.value } })} className="input-field w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Estado Civil</label>
                                        <select value={userForm.profile.civil_status} onChange={e => setUserForm({ ...userForm, profile: { ...userForm.profile, civil_status: e.target.value } })} className="input-field w-full text-sm">
                                            <option value="">-- Seleccionar --</option>
                                            <option value="Soltero/a">Soltero/a</option>
                                            <option value="Casado/a">Casado/a</option>
                                            <option value="Divorciado/a">Divorciado/a</option>
                                            <option value="Viudo/a">Viudo/a</option>
                                            <option value="Unión Libre">Unión Libre</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Fotografía de Perfil</label>
                                        <input type="file" accept="image/*" onChange={e => setUserForm({ ...userForm, profile: { ...userForm.profile, photo: e.target.files[0] } })} className="input-field w-full text-sm text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
