import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [userPermissions, setUserPermissions] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPermissions = async () => {
        try {
            const token = sessionStorage.getItem('authToken');

            // Verificación extra: si no hay cookie de sesión activa, limpiar storage
            const hasSessionCookie = document.cookie.includes('crm_session_active=true');
            if (token && !hasSessionCookie) {
                console.log("Sesión de navegador finalizada. Forzando re-login.");
                logout();
                return;
            }

            if (token) {
                axios.defaults.headers.common['Authorization'] = `Token ${token}`;
                const res = await axios.get('/api/core/user-permissions/');
                setUserPermissions(res.data);
            } else {
                setUserPermissions(null);
            }
        } catch (error) {
            console.error("Error fetching permissions:", error);
            setUserPermissions(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Limpiar remanentes de la lógica anterior de localStorage
        localStorage.removeItem('authToken');
        fetchPermissions();
    }, []);

    const login = async (token) => {
        setIsLoading(true);
        sessionStorage.setItem('authToken', token);
        // Establecer cookie de sesión (se borra al cerrar el proceso del navegador)
        document.cookie = "crm_session_active=true; path=/; SameSite=Strict";
        await fetchPermissions();
    };

    const logout = () => {
        sessionStorage.removeItem('authToken');
        // Eliminar cookie de sesión
        document.cookie = "crm_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        delete axios.defaults.headers.common['Authorization'];
        setUserPermissions(null);
    };

    // Auto-logout after 10 minutes of inactivity
    useEffect(() => {
        if (!userPermissions) return;

        let timeout;
        const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

        const resetTimer = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                console.log("Sesión finalizada por inactividad.");
                logout();
                window.location.href = '/login';
            }, INACTIVITY_LIMIT);
        };

        // Events to track activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => document.addEventListener(event, resetTimer));

        // Start timer
        resetTimer();

        return () => {
            if (timeout) clearTimeout(timeout);
            events.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [userPermissions]);

    const hasViewPermission = (viewId) => {
        if (!userPermissions) return false;
        if (userPermissions.is_superuser) return true;
        return userPermissions.allowed_views.includes(viewId);
    };

    return (
        <AuthContext.Provider value={{ userPermissions, isLoading, login, logout, hasViewPermission }}>
            {children}
        </AuthContext.Provider>
    );
};
