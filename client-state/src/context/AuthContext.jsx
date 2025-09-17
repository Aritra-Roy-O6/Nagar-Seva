import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // You may need to install this: npm install jwt-decode

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('adminToken'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            if (token) {
                // Decode the token to get user details and check expiry
                const decoded = jwtDecode(token);
                // Optional: Check if token is expired
                if (decoded.exp * 1000 > Date.now()) {
                    setUser(decoded.user);
                } else {
                    // Token expired
                    logout();
                }
            }
        } catch (error) {
            console.error("Failed to decode token:", error);
            logout(); // Clear invalid token
        } finally {
            setLoading(false);
        }
    }, [token]);

    const login = (newToken) => {
        localStorage.setItem('adminToken', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        setToken(null);
        setUser(null);
    };

    const authContextValue = {
        user,
        token,
        login,
        logout,
        loading,
        isAuthenticated: !!token && !!user
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};