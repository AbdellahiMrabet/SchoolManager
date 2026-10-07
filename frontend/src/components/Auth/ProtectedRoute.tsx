// src/components/Auth/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { LoginPage } from './LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    // Check if token is expired on mount
    const checkToken = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);
          
          if (decoded.exp) {
            const expirationTime = decoded.exp * 1000;
            if (Date.now() >= expirationTime) {
              logout();
            }
          }
        } catch (e) {
        }
      }
    };
    
    checkToken();
  }, [logout]);

  if (isLoading) {
    return <LoadingSpinner message="جاري التحقق من المصادقة..." />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};