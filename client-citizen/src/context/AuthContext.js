import React from 'react';
import { createContext, useState, useEffect } from 'react';
import apiClient from '../api/client'; // Ensure your API client is correctly imported

// Storage abstraction for both web and React Native
let storage;
try {
  storage = require('@react-native-async-storage/async-storage').default;
} catch (err) {
  // Fallback for web or other environments if needed
  storage = {
    getItem: async key => Promise.resolve(localStorage.getItem(key)),
    setItem: async (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: async key => Promise.resolve(localStorage.removeItem(key)),
  };
}

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState('guest');
  const [isLoading, setIsLoading] = useState(true);

  // Check for a stored token when the app starts
  const isUserLoggedIn = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getItem('userToken');
      if (token) {
        setUserToken(token);
        setUserRole('citizen'); // Assuming only citizens use this app
      } else {
        setUserRole('guest');
      }
    } catch (e) {
      console.error('Error checking for saved token:', e);
      setUserRole('guest');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isUserLoggedIn();
  }, []);

  const authContext = {
    /**
     * Connects to the backend to sign in the user.
     */
    signIn: async (phone, password) => {
      // The 'signIn' function now makes a POST request to the `/api/auth/login` endpoint.
      const response = await apiClient.post('/auth/login', {
        identifier: phone,
        password: password,
        userType: 'citizen',
      });

      const { token } = response.data;
      await storage.setItem('userToken', token);
      setUserToken(token);
      setUserRole('citizen');
    },

    /**
     * Connects to the backend to register a new user.
     */
    register: async (fullName, phone, password) => {
      // Makes a POST request to the `/api/auth/citizen/register` endpoint.
      await apiClient.post('/auth/citizen/register', {
        name: fullName,
        phone_no: phone,
        password: password,
      });
    },

    /**
     * Signs the user out by removing the token.
     */
    signOut: async () => {
      try {
        await storage.removeItem('userToken');
        setUserToken(null);
        setUserRole('guest');
      } catch (e) {
        console.error('Error signing out:', e);
      }
    },

    userToken,
    userRole,
    isLoading,
  };

  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
};