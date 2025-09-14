import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('adminToken'));
  const [user, setUser] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const districtsResponse = await apiClient.get('/districts');
        setDistricts(districtsResponse.data);

        const token = localStorage.getItem('adminToken');
        if (token) {
          const decodedToken = jwtDecode(token);
          setUser(decodedToken.user);
          setAuthToken(token);
        }
      } catch (error) {
        console.error("Initialization failed", error);
        localStorage.removeItem('adminToken');
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeApp();
  }, []);

  // Updated login function, no longer needs districtId
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        identifier: email,
        password: password,
        userType: 'admin',
      });
      
      const { token, user: userData } = response.data;

      // The frontend validation check is removed. The backend is the source of truth.
      localStorage.setItem('adminToken', token);
      setAuthToken(token);
      setUser(userData);
    } catch (error) {
      console.error('Admin login failed:', error);
      throw error.response?.data?.message || 'Login failed.';
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
    setUser(null);
  };

  if (loading) {
    return <div>Loading Application...</div>; 
  }

  return (
    <AuthContext.Provider value={{ authToken, user, districts, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

