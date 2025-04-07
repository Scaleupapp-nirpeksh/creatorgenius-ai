// frontend/src/context/AuthContext.tsx
"use client"; // Context needs to be a client component

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { registerUserApi, loginUserApi, getCurrentUserApi } from '../services/api'; // We'll create this next
import { User } from '../types'; // Define User type later if needed

interface AuthContextType {
  token: string | null;
  user: User | null; // Replace 'User' with your actual User type if defined
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>; // Replace 'any' with LoginCredentials type
  register: (userData: any) => Promise<void>; // Replace 'any' with RegisterUserData type
  logout: () => void;
  checkAuthStatus: () => Promise<void>; // Function to check token validity on load
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null); // Define User type
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until auth status is checked

  // Function to check if a token exists and fetch user data
  const checkAuthStatus = async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      try {
        // Optional: Verify token with backend /me endpoint
        const userData = await getCurrentUserApi(storedToken); // Fetch user data using token
        setToken(storedToken);
        setUser(userData); // Assuming getCurrentUserApi returns user data
         console.log("Auth check successful, user set:", userData);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem('authToken'); // Invalid token, remove it
        setToken(null);
        setUser(null);
      }
    } else {
        setToken(null);
        setUser(null);
    }
    setIsLoading(false);
  };

  // Check auth status on initial load
  useEffect(() => {
    checkAuthStatus();
  }, []); // Empty dependency array ensures it runs only once on mount


  const login = async (credentials: any) => { // Replace any
    setIsLoading(true);
    try {
      const { token: newToken } = await loginUserApi(credentials); // Assuming API returns { token: '...' }
      localStorage.setItem('authToken', newToken);
      setToken(newToken);
      // Fetch user data after successful login
      const userData = await getCurrentUserApi(newToken);
      setUser(userData);
       console.log("Login successful, user set:", userData);
    } catch (error) {
      console.error("Login failed:", error);
      setToken(null);
      setUser(null);
      throw error; // Re-throw error to handle it in the component
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => { // Replace any
     setIsLoading(true);
    try {
      const { token: newToken } = await registerUserApi(userData); // Assuming API returns { token: '...' }
      localStorage.setItem('authToken', newToken);
      setToken(newToken);
       // Fetch user data after successful registration
      const userDataRes = await getCurrentUserApi(newToken);
      setUser(userDataRes);
       console.log("Registration successful, user set:", userDataRes);
    } catch (error) {
      console.error("Registration failed:", error);
      setToken(null);
      setUser(null);
      throw error; // Re-throw error to handle it in the component
    } finally {
        setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    // Optionally: Redirect to login page using useRouter hook from 'next/navigation' in the component calling logout
    console.log("User logged out");
  };

  const isAuthenticated = !!token && !!user; // Simple check if token and user exist

  return (
    <AuthContext.Provider value={{ token, user, isLoading, isAuthenticated, login, register, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};