// src/services/authService.ts
import apiService from './api';
import { User } from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, usertype?: number) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export class AuthService {
  private user: User | null = null;
  private token: string | null = null;
  private isLoading: boolean = true;

  constructor() {
    this.token = localStorage.getItem('access_token');
    if (this.token) {
      apiService.setToken(this.token);
    }
  }

  async init(): Promise<void> {
    this.isLoading = true;
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      this.token = storedToken;
      apiService.setToken(storedToken);
      try {
        const response = await apiService.getCurrentUser();
        this.user = response.user;
      } catch (error: any) {
        console.error('Auth initialization failed:', error);
        // If token is invalid, logout
        if (error.message?.includes('expired') || error.message?.includes('session')) {
          this.logout();
        } else {
          // For other errors, try to recover
          console.warn('Non-critical auth error:', error);
        }
      }
    }
    this.isLoading = false;
  }

  async login(username: string, password: string): Promise<void> {
    const data = await apiService.login(username, password);
    this.token = data.access_token;
    this.user = data.user;
    apiService.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
  }

  async register(username: string, email: string, password: string, usertype: number = 2): Promise<void> {
    const data = await apiService.register(username, email, password, usertype);
    this.token = data.access_token;
    this.user = data.user;
    apiService.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
  }

  logout(): void {
    this.user = null;
    this.token = null;
    apiService.setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    try {
      const data = await apiService.refreshToken(refreshToken);
      this.token = data.access_token;
      apiService.setToken(data.access_token);
      localStorage.setItem('access_token', data.access_token);
    } catch (error) {
      // If refresh fails, logout
      this.logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  getState(): AuthContextType {
    return {
      user: this.user,
      token: this.token,
      login: this.login.bind(this),
      register: this.register.bind(this),
      logout: this.logout.bind(this),
      refreshToken: this.refreshToken.bind(this),
      isAuthenticated: !!this.user,
      isLoading: this.isLoading,
    };
  }
}

export const authService = new AuthService();