import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Shield, Users, Pencil, Trash2, Eye, EyeOff, RefreshCw, Mail, CheckCircle, AlertCircle, Database, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VIEWS_OPTIONS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'clients', label: 'Clientes' },
    { id: 'services', label: 'Servicios' },
    { id: 'support', label: 'Soporte' },
    { id: 'billing', label: 'Facturación' },
    { id: 'catalog', label: 'Catálogo de Servicios' },
    { id: 'settings', label: 'Configuración (Super Admin / Roles)' }
];

/**
 * Generate a cryptographically secure password of given length on the frontend.
 * Follows best practices: uppercase, lowercase, digit, special char guaranteed.
 */
function generateSecurePassword(length = 8) {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // removed ambiguous I, O
    const lower = 'abcdefghjkmnpqrstuvwxyz';      // removed ambiguous l, o
    const digits = '23456789';                    // removed ambiguous 0, 1
    const specials = '!@#$%^&*()-_=+[]{}|;:,.';
    const all = upper + lower + digits + specials;

    const array = new Uint8Array(length + 10);
    crypto.getRandomValues(array);

    const required = [
        upper[array[0] % upper.length],
        lower[array[1] % lower.length],
        digits[array[2] % digits.length],
        specials[array[3] % specials.length],
    ];

    const rest = [];
    for (let i = 4; i < length + 4; i++) {
        rest.push(all[array[i] % all.length]);
    }

    const combined = [...required, ...rest];
    // Fisher-Yates shuffle using random values
    const shuffleArr = new Uint8Array(combined.length);
    crypto.getRandomValues(shuffleArr);
    for (let i = combined.length - 1; i > 0; i--) {
        const j = shuffleArr[i] % (i + 1);
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined.join('').substring(0, length);
}

export default function Settings() {
    const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'users'
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);

    // Modals
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    // Password visibility
    const [showPassword, setShowPassword] = useState(false);

    // Send password state
    const [sendingPassword, setSendingPassword] = useState(false);
    const [passwordSentResult, setPasswordSentResult] = useState(null); // { success, message, password }

    // Forms
    const [roleForm, setRoleForm] = useState({ id: null, name: '', description: '', allowed_views: [] });
    const [userForm, setUserForm] = useState({
        id: null, username: '', first_name: '', last_name: '', email: '', password: '',
        profile: { cedula: '', cargo: '', role: '', birthdate: '', civil_status: '', photo: null }
    });

    // Auth context to check if current user is superadmin
    const { userPermissions } = useAuth();
    const isSuperAdmin = userPermissions?.is_superuser;

    const [generatingBackup, setGeneratingBackup] = useState(false);

    const handleGenerateBackup = async () => {
        setGeneratingBackup(true);
        try {
            const res = await axios.get('/api/core/backup/', { responseType: 'blob' });
            const contentDisposition = res.headers['content-disposition'] || '';
            const match = contentDisposition.match(/filename="([^"]+)"/);
            const filename = match ? match[1] : `datacom_crm_backup_${new Date().toISOString().slice(0,19).replace(/[:.]/g, '-')}.dump`;
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/octet-stream' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Error al generar el respaldo. Intente nuevamente.');
            console.error(err);
        } finally {
            setGeneratingBackup(false);
        }
    };

    useEffect(() => {
        fetchRoles();
        fetchUsers();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await axios.get('/api/core/roles/');
            setRoles(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching roles", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/core/users/');
            setUsers(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching users", error);
        }
    };

    // --- Role Actions ---
    const openNewRole = () => {
        setRoleForm({ id: null, name: '', description: '', allowed_views: [] });
        setIsRoleModalOpen(true);
    };

    const openEditRole = (role) => {
        setRoleForm({
            id: role.id,
            name: role.name,
            description: role.description || '',
            allowed_views: role.allowed_views || []
        });
        setIsRoleModalOpen(true);
    };

    const handleRoleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (roleForm.id) {
                await axios.put(`/api/core/roles/${roleForm.id}/`, roleForm);
            } else {
                await axios.post('/api/core/roles/', roleForm);
            }
            setIsRoleModalOpen(false);
            fetchRoles();
        } catch (error) {
            alert("Error al guardar el rol.");
        }
    };

    const deleteRole = async (id, name) => {
        if (window.confirm(`¿Seguro que deseas eliminar el rol ${name}?`)) {
            try {
                await axios.delete(`/api/core/roles/${id}/`);
                fetchRoles();
                fetchUsers(); // Users might lose their role
            } catch (error) {
                alert("Error al eliminar. Podría haber usuarios asignados a este rol.");
            }
        }
    };

    const toggleViewOption = (viewId) => {
        setRoleForm(prev => {
            const views = [...prev.allowed_views];
            if (views.includes(viewId)) {
                return { ...prev, allowed_views: views.filter(v => v !== viewId) };
            } else {
                return { ...prev, allowed_views: [...views, viewId] };
            }
        });
    };

    // --- User Actions ---
    const openNewUser = () => {
        setUserForm({
            id: null, username: '', first_name: '', last_name: '', email: '', password: '',
            profile: { cedula: '', cargo: '', role: '', birthdate: '', civil_status: '', photo: null }
        });
        setShowPassword(false);
        setPasswordSentResult(null);
        setIsUserModalOpen(true);
    };

    const openEditUser = (user) => {
        setUserForm({
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email || '',
            password: '', // blank so we don't overwrite if not typing anything
            profile: {
                cedula: user.profile?.cedula || '',
                cargo: user.profile?.cargo || '',
                role: user.profile?.role || '',
                birthdate: user.profile?.birthdate || '',
                civil_status: user.profile?.civil_status || '',
                photo: null
            }
        });
        setShowPassword(false);
        setPasswordSentResult(null);
        setIsUserModalOpen(true);
    };

    const handleGeneratePassword = () => {
        const pwd = generateSecurePassword(8);
        setUserForm(prev => ({ ...prev, password: pwd }));
        setShowPassword(true);
    };

    const handleSendGeneratedPassword = async () => {
        if (!userForm.id) {
            alert("Primero guarda el usuario antes de enviar la contraseña por correo.");
            return;
        }
        if (!userForm.email) {
            alert("El usuario no tiene correo electrónico configurado.");
            return;
        }

        setSendingPassword(true);
        setPasswordSentResult(null);

        try {
            const res = await axios.post('/api/core/generate-password/', { user_id: userForm.id });
            const generatedPwd = res.data.generated_password;
            setUserForm(prev => ({ ...prev, password: generatedPwd }));
            setShowPassword(true);
            setPasswordSentResult({
                success: true,
                message: res.data.message,
                password: generatedPwd
            });
        } catch (error) {
            const errMsg = error.response?.data?.error || "Error al generar y enviar la contraseña.";
            const genPwd = error.response?.data?.generated_password;
            setPasswordSentResult({
                success: false,
                message: errMsg,
                password: genPwd
            });
            if (genPwd) {
                setUserForm(prev => ({ ...prev, password: genPwd }));
                setShowPassword(true);
            }
        } finally {
            setSendingPassword(false);
        }
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();

        // Prepare data. Remove password if empty (so we don't reset it to blank)
        const submitData = { ...userForm };
        if (!submitData.password) {
            delete submitData.password;
        }

        // Deal with empty profile role string
        if (submitData.profile.role === "") {
            submitData.profile.role = null;
        }

        const formData = new FormData();
        formData.append('username', submitData.username);
        formData.append('first_name', submitData.first_name);
        formData.append('last_name', submitData.last_name);
        formData.append('email', submitData.email || '');
        if (submitData.password) formData.append('password', submitData.password);

        formData.append('profile.cedula', submitData.profile.cedula || '');
        formData.append('profile.cargo', submitData.profile.cargo || '');
        
        if (submitData.profile.birthdate) {
            formData.append('profile.birthdate', submitData.profile.birthdate);
        }
        if (submitData.profile.civil_status) {
            formData.append('profile.civil_status', submitData.profile.civil_status);
        }
        if (submitData.profile.role) formData.append('profile.role', submitData.profile.role);
        
        if (submitData.profile.photo instanceof File) {
            formData.append('profile.photo', submitData.profile.photo);
        }

        try {
            if (submitData.id) {
                await axios.put(`/api/core/users/${submitData.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await axios.post('/api/core/users/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            setIsUserModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error(error.response?.data);
            const msg = error.response?.data?.username 
                ? "Este nombre de usuario ya existe." 
                : "Error al guardar el usuario: " + JSON.stringify(error.response?.data || error.message);
            alert(msg);
        }
    };

    const deleteUser = async (id, name) => {
        if (window.confirm(`¿Seguro que deseas eliminar el usuario ${name}?`)) {
            try {
                await axios.delete(`/api/core/users/${id}/`);
                fetchUsers();
            } catch (error) {
                alert(error.response?.data?.error || "Error al eliminar usuario.");
            }
        }
    };

    return (
        <div className="animate-fade-in pb-10">
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">Configuración</h1>
                        <p className="mt-2 text-sm text-slate-600">Gestión de roles de acceso y usuarios del sistema.</p>
                    </div>
                    {isSuperAdmin && (
                        <button
                            onClick={handleGenerateBackup}
                            disabled={generatingBackup}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors shrink-0"
                            title="Genera un volcado completo de PostgreSQL (.dump)"
                        >
                            {generatingBackup
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Database className="w-4 h-4" />}
                            {generatingBackup ? 'Generando...' : 'Generar Respaldo BDD'}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'roles'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Shield className="w-5 h-5" />
                        Roles y Permisos
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'users'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Users className="w-5 h-5" />
                        Usuarios (Personas)
                    </button>
                </nav>
            </div>

            {/* ROLES TAB */}
            {activeTab === 'roles' && (
                <div>
                    <div className="mb-4 flex justify-end">
                        <button onClick={openNewRole} className="btn-primary flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Nuevo Rol
                        </button>
                    </div>

                    <div className="card overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Descripción</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Permisos (Vistas)</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {roles.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-4 text-center text-slate-500">No hay roles registrados</td></tr>
                                ) : (
                                    roles.map(role => (
                                        <tr key={role.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{role.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 hidden md:table-cell">{role.description}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                <div className="flex flex-wrap gap-1">
                                                    {role.allowed_views.map(v => (
                                                        <span key={v} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md">
                                                            {VIEWS_OPTIONS.find(opt => opt.id === v)?.label || v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEditRole(role)} className="text-primary-600 hover:text-primary-900 bg-primary-50 p-2 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => deleteRole(role.id, role.name)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div>
                    <div className="mb-4 flex justify-end">
                        <button onClick={openNewUser} className="btn-primary flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Nuevo Usuario
                        </button>
                    </div>

                    <div className="card overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cédula</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cargo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Accesos</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {users.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-4 text-center text-slate-500">No hay usuarios registrados</td></tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold ring-1 ring-slate-200 overflow-hidden shrink-0">
                                                        {user.profile?.photo ? (
                                                            <img src={user.profile.photo} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            (user.first_name || user.username).substring(0, 1)
                                                        )}
                                                    </div>
                                                    <div>
                                                        {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
                                                        <div className="text-xs text-slate-400 font-normal">@{user.username}</div>
                                                        {user.email && <div className="text-xs text-slate-400 font-normal">{user.email}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.profile?.cedula || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.profile?.cargo || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {user.username === 'admin' ? (
                                                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md font-medium">Súper Admin</span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md">
                                                        {user.profile?.role_name || 'Sin Rol (Bloqueado)'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEditUser(user)} className="text-primary-600 hover:text-primary-900 bg-primary-50 p-2 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                                    {user.username !== 'admin' && (
                                                        <button onClick={() => deleteUser(user.id, user.username)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ROLE MODAL */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">{roleForm.id ? 'Editar Rol' : 'Nuevo Rol'}</h3>
                            <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleRoleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Rol *</label>
                                    <input type="text" required value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} className="input-field w-full" placeholder="Ej. Ventas" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                    <textarea value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} className="input-field w-full" rows="2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Vistas Permitidas (Accesos)</label>
                                    <div className="grid grid-cols-1 gap-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        {VIEWS_OPTIONS.map(view => (
                                            <label key={view.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                    checked={roleForm.allowed_views.includes(view.id)}
                                                    onChange={() => toggleViewOption(view.id)}
                                                />
                                                <span className="text-sm text-slate-800">{view.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsRoleModalOpen(false)} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* USER MODAL */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">{userForm.id ? 'Editar Persona / Usuario' : 'Nueva Persona'}</h3>
                            <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleUserSubmit} className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                {/* LEFT COLUMN: Credentials */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm text-slate-800 border-b pb-1">Credenciales de Acceso</h4>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Usuario *</label>
                                        <input type="text" required value={userForm.username} disabled={!isSuperAdmin || userForm.username === 'admin'} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="input-field w-full text-sm" placeholder="Ej. jperez" />
                                    </div>

                                    {/* Email field */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Correo Electrónico {!userForm.id && '*'}
                                        </label>
                                        <input
                                            type="email"
                                            required={!userForm.id}
                                            value={userForm.email}
                                            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                            className="input-field w-full text-sm"
                                            placeholder="usuario@empresa.com"
                                        />
                                    </div>

                                    {/* Password field with show/hide and generate buttons */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Contraseña {userForm.id && <span className="text-slate-400 font-normal">(Dejar en blanco para no cambiar)</span>} {!userForm.id && '*'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required={!userForm.id}
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                className="input-field w-full text-sm pr-10 font-mono tracking-wider"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                                                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {/* Password action buttons */}
                                        <div className="flex gap-2 mt-2">
                                            {/* Generate password (client-side, just fills the field) */}
                                            <button
                                                type="button"
                                                onClick={handleGeneratePassword}
                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-medium transition-colors"
                                                title="Generar contraseña segura"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" /> Generar
                                            </button>

                                            {/* Send generated password via email (server-side, only for existing users with email) */}
                                            {userForm.id && userForm.email && (
                                                <button
                                                    type="button"
                                                    onClick={handleSendGeneratedPassword}
                                                    disabled={sendingPassword}
                                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                                                    title="Generar nueva contraseña y enviar por correo"
                                                >
                                                    {sendingPassword ? (
                                                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                                                    ) : (
                                                        <><Mail className="w-3.5 h-3.5" /> Generar y Enviar</>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Send result notification */}
                                        {passwordSentResult && (
                                            <div className={`mt-2 p-2 rounded-lg flex items-start gap-2 text-xs ${passwordSentResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                                {passwordSentResult.success
                                                    ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                    : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                                                <span>{passwordSentResult.message}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Rol Asignado *</label>
                                        <select
                                            required
                                            value={userForm.profile.role}
                                            onChange={e => setUserForm({ ...userForm, profile: { ...userForm.profile, role: e.target.value } })}
                                            className="input-field w-full text-sm"
                                            disabled={!isSuperAdmin || userForm.username === 'admin'}
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {roles.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Personal data */}
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
                                        <input type="text" required value={userForm.profile.cargo} onChange={e => setUserForm({ ...userForm, profile: { ...userForm.profile, cargo: e.target.value } })} className="input-field w-full text-sm" placeholder="Ej. Vendedor" />
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
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
