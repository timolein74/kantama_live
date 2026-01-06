import { create } from 'zustand';
import type { User } from '../types';
import { auth } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    company_name?: string;
    business_id?: string;
  }) => Promise<void>;
  logout: () => void;
  setDemoUser: (user: User, token: string) => void;
  initFromStorage: () => void;
}

// Initialize from localStorage on page load
const getInitialState = () => {
  const token = localStorage.getItem('token');
  if (token?.startsWith('demo-token-')) {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        if (parsed?.state?.user) {
          return {
            user: parsed.state.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          };
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthState>()((set) => ({
  user: initialState.user,
  token: initialState.token,
  isLoading: initialState.isLoading,
  isAuthenticated: initialState.isAuthenticated,

  login: async (email, password) => {
    const response = await auth.login(email, password);
    const { access_token, user } = response.data;
    
    localStorage.setItem('token', access_token);
    set({ user, token: access_token, isAuthenticated: true, isLoading: false });
  },

  register: async (data) => {
    const response = await auth.register(data);
    const { access_token, user } = response.data;
    
    localStorage.setItem('token', access_token);
    set({ user, token: access_token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth-storage');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setDemoUser: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token, user, isAuthenticated: true },
      version: 0
    }));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  initFromStorage: () => {
    const newState = getInitialState();
    set(newState);
  },
}));
