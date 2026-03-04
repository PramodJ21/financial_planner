import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await fetchWithAuth('/auth/me');
                    setUser(userData);
                } catch (err) {
                    console.error('Auth verification failed', err);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const data = await fetchWithAuth('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        localStorage.setItem('token', data.token);
        setUser(data.user);
    };

    const register = async (fullName, email, password, phone) => {
        const data = await fetchWithAuth('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ fullName, email, password, phone })
        });
        localStorage.setItem('token', data.token);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
