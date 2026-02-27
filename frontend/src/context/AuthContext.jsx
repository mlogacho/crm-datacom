import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [userPermissions, setUserPermissions] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPermissions = async () => {
        try {
            const token = localStorage.getItem('authToken');
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
        fetchPermissions();
    }, []);

    const login = async (token) => {
        setIsLoading(true);
        localStorage.setItem('authToken', token);
        await fetchPermissions();
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        delete axios.defaults.headers.common['Authorization'];
        setUserPermissions(null);
    };

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
