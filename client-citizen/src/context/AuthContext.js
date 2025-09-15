import React, { createContext, useState, useEffect } from 'react';

// Storage abstraction: works in both web (localStorage) and React Native (AsyncStorage)
let storage;
try {
  storage = require('@react-native-async-storage/async-storage').default;
} catch (err) {
  storage = {
    getItem: async (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: async (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: async (key) => Promise.resolve(localStorage.removeItem(key)),
  };
}

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState("guest");
  const [isLoading, setIsLoading] = useState(true);

  // Check stored token at app start
  const isUserLoggedIn = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getItem('userToken');
      if (token) {
        setUserToken(token);
        setUserRole("citizen");
      } else {
        setUserRole("guest");
      }
    } catch (e) {
      console.log("Error checking for saved token:", e);
      setUserRole("guest");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isUserLoggedIn();
  }, []);

  const authContext = {
    /**
     * Fake sign-in → accepts any phone/password
     */
    signIn: async (phone, password, userType = "citizen") => {
      try {
        // Instead of calling API, just generate a fake token
        const fakeToken = "token_" + new Date().getTime();
        await storage.setItem("userToken", fakeToken);
        setUserToken(fakeToken);
        setUserRole(userType);
      } catch (e) {
        console.log("Login error:", e);
      }
    },

    /**
     * Register → optional (kept here but not used since login is fake)
     */
    register: async (fullName, phone, password) => {
      console.log("Fake register successful for:", fullName, phone);
      return true;
    },

    /**
     * Sign-out → back to guest
     */
    signOut: async () => {
      try {
        await storage.removeItem("userToken");
        setUserToken(null);
        setUserRole("guest");
      } catch (e) {
        console.log("Error signing out:", e);
      }
    },

    userToken,
    userRole,
    isLoading,
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};
