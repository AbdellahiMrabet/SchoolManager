// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService, AuthContextType } from '../services/authService';
import { apiService, TOKEN_EXPIRED_EVENT } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthContextType>({
    user: null,
    token: null,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    refreshToken: async () => {},
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const initAuth = async () => {
      await authService.init();
      setState(authService.getState());
    };
    initAuth();

    // Listen for token expired events
    const handleTokenExpired = () => {
      authService.logout();
      setState(authService.getState());
      alert('انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.');
    };

    window.addEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired);

    return () => {
      window.removeEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired);
    };
  }, []);

  const login = async (username: string, password: string) => {
    await authService.login(username, password);
    setState(authService.getState());
  };

  const register = async (username: string, email: string, password: string, usertype?: number) => {
    await authService.register(username, email, password, usertype);
    setState(authService.getState());
  };

  const logout = () => {
    authService.logout();
    apiService.logout(); // Also clear API service tokens
    setState(authService.getState());
  };

  const refreshToken = async () => {
    await authService.refreshToken();
    setState(authService.getState());
  };

  const value: AuthContextType = {
    user: state.user,
    token: state.token,
    login,
    register,
    logout,
    refreshToken,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};