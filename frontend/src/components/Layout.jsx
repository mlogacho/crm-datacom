import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
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

const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Servicios', href: '/services', icon: Server },
    { name: 'Soporte', href: '/support', icon: LifeBuoy },
    { name: 'Facturación', href: '/billing', icon: FileText },
];

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-slate-900/80" onClick={() => setSidebarOpen(false)} />
                <div className="fixed inset-y-0 left-0 w-64 bg-brand-dark transition-transform flex flex-col pt-5 pb-4">
                    <div className="flex items-center justify-between px-4 mb-6">
                        <img src="/logo.jpg" alt="DATACOM S.A. Logo" className="h-10 object-contain bg-white rounded p-1" />
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
                        <img src="/logo.jpg" alt="DATACOM S.A. Logo" className="h-10 object-contain bg-white rounded p-1" />
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
                    <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                        <Settings className="mr-3 h-5 w-5 text-slate-400" />
                        Configuración
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem('authToken');
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
                                />
                            </div>
                        </div>
                        <div className="ml-4 flex items-center space-x-4 md:space-x-6">
                            <button className="text-slate-400 hover:text-slate-500 relative">
                                <Bell className="h-6 w-6" />
                                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                            </button>

                            {/* Profile */}
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:block text-right">
                                    <div className="text-sm font-medium text-slate-900">Admin User</div>
                                    <div className="text-xs text-slate-500">Administrador CRM</div>
                                </div>
                                <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
                                    AU
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
        </div>
    );
}
