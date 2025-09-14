import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client'; // Assuming you have an axios or fetch wrapper

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
    } catch (e) {
      console.log('Error checking for saved token:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isUserLoggedIn();
  }, []);

  const authContext = {
    /**
     * Handles user sign-in using phone number and password.
     * Aligns with the /api/auth/login endpoint.
     */
    signIn: async (phone, password, userType = 'citizen') => {
      try {
        const response = await apiClient.post('/auth/login', {
          identifier: phone,
          password,
          userType
        });
        const { token } = response.data;
        await AsyncStorage.setItem('userToken', token);
        setUserToken(token);
      } catch (e) {
        console.log('Login error:', e.response?.data?.message || 'An error occurred');
        throw new Error(e.response?.data?.message || 'Login Failed');
      }
    },
    /**
     * Handles new citizen registration using full name, phone number, and password.
     * Aligns with the /api/auth/citizen/register endpoint.
     * Note: This function does not log the user in, as the backend endpoint
     * does not return a token upon registration.
     */
    register: async (fullName, phone, password) => {
      try {
        await apiClient.post('/auth/citizen/register', {
          name: fullName,
          phone_no: phone,
          password: password
        });
        // Registration successful, but no token is returned from this endpoint.
        // The UI should guide the user to the login screen.
      } catch (e) {
        console.log('Register error:', e.response?.data?.message || 'An error occurred');
        throw new Error(e.response?.data?.message || 'Registration Failed');
      }
    },
    /**
     * Handles user sign-out by removing the token.
     */
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
