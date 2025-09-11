import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // This function is called when the app first loads.
  // It checks if a token is already stored on the device.
  const isUserLoggedIn = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      setUserToken(token);
      setIsLoading(false);
    } catch (e) {
      console.log('Error checking for saved token:', e);
    }
  };

  useEffect(() => {
    isUserLoggedIn();
  }, []);

  const authContext = {
    // The signIn function
    signIn: async (email, password) => {
      try {
        const response = await apiClient.post('/auth/login', { email, password });
        const { token } = response.data;
        await AsyncStorage.setItem('userToken', token);
        setUserToken(token);
      } catch (e) {
        // Handle login errors (e.g., show an alert)
        console.log('Login error:', e.response?.data?.message || 'An error occurred');
        throw new Error(e.response?.data?.message || 'Login Failed');
      }
    },
    // The register function
    register: async (fullName, email, password) => {
      try {
        const response = await apiClient.post('/auth/register', { fullName, email, password });
        // After successful registration, we get the token back directly
        const { token } = response.data;
        await AsyncStorage.setItem('userToken', token);
        setUserToken(token);
      } catch (e) {
        console.log('Register error:', e.response?.data?.message || 'An error occurred');
        throw new Error(e.response?.data?.message || 'Registration Failed');
      }
    },
    // The signOut function
    signOut: async () => {
      try {
        await AsyncStorage.removeItem('userToken');
        setUserToken(null);
      } catch (e) {
        console.log('Error signing out:', e);
      }
    },
    userToken,
    isLoading,
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};

