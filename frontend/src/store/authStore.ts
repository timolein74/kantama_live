import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '../types';

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
  checkAuth: () => Promise<void>;
}

// Initialize from localStorage for demo mode
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
    isLoading: false, // Start as false to avoid loading screen hang
  };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: initialState.user,
  token: initialState.token,
  isLoading: initialState.isLoading,
  isAuthenticated: initialState.isAuthenticated,

  checkAuth: async () => {
    // If Supabase is not configured, use demo mode
    if (!isSupabaseConfigured()) {
      const demoState = getInitialState();
      set({ ...demoState, isLoading: false });
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        const user: User = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          company_name: profile.company_name,
          business_id: profile.business_id,
          phone: profile.phone,
          is_active: profile.is_active,
          is_verified: profile.is_verified,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
        
        // Tallenna localStorage:een ProtectedRoutea varten
        localStorage.setItem('token', session.access_token);
        localStorage.setItem('auth-storage', JSON.stringify({
          state: { token: session.access_token, user, isAuthenticated: true },
          version: 0
        }));
        
        set({ 
          user, 
          token: session.access_token, 
          isAuthenticated: true, 
          isLoading: false 
        });
      } else {
        // Profiilia ei löydy - uusi käyttäjä, älä poista sessiota
        // Ohjataan set-password sivulle jos ei ole jo siellä
        if (!window.location.pathname.includes('/set-password')) {
          // Uusi käyttäjä tarvitsee profiilin luomisen - ohjaa salasanan asettamiseen
          window.location.href = '/set-password';
        }
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    // If Supabase is not configured, use demo mode
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase ei ole konfiguroitu. Käytä demo-paneelia kirjautumiseen.');
    }

    set({ isLoading: true });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ isLoading: false });
      if (error.message === 'Invalid login credentials') {
        throw new Error('Virheellinen sähköposti tai salasana');
      }
      if (error.message === 'Email not confirmed') {
        throw new Error('Sähköpostia ei ole vahvistettu. Tarkista sähköpostisi.');
      }
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      set({ isLoading: false });
      throw new Error('Kirjautuminen epäonnistui');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      set({ isLoading: false });
      throw new Error('Käyttäjäprofiilia ei löytynyt');
    }

    const user: User = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      company_name: profile.company_name,
      business_id: profile.business_id,
      phone: profile.phone,
      is_active: profile.is_active,
      is_verified: profile.is_verified,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    // Tallenna localStorage:een ProtectedRoutea varten
    localStorage.setItem('token', data.session.access_token);
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token: data.session.access_token, user, isAuthenticated: true },
      version: 0
    }));

    set({ 
      user, 
      token: data.session.access_token, 
      isAuthenticated: true, 
      isLoading: false 
    });
  },

  register: async (data) => {
    // If Supabase is not configured, use demo mode
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase ei ole konfiguroitu. Rekisteröinti ei ole käytettävissä.');
    }

    set({ isLoading: true });

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          company_name: data.company_name,
          business_id: data.business_id,
          phone: data.phone,
          role: 'CUSTOMER',
        },
        emailRedirectTo: `${window.location.origin}/login?verified=true`,
      },
    });

    if (error) {
      set({ isLoading: false });
      if (error.message.includes('already registered')) {
        throw new Error('Tämä sähköpostiosoite on jo rekisteröity');
      }
      throw new Error(error.message);
    }

    set({ isLoading: false });

    // If email confirmation is required, user won't be logged in yet
    if (authData.user && !authData.session) {
      // Email confirmation required
      return;
    }

    // If auto-confirmed (development), log in
    if (authData.session && authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        const user: User = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          company_name: profile.company_name,
          business_id: profile.business_id,
          phone: profile.phone,
          is_active: profile.is_active,
          is_verified: profile.is_verified,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
        set({ 
          user, 
          token: authData.session.access_token, 
          isAuthenticated: true 
        });
      }
    }
  },

  logout: async () => {
    // Tyhjennä state heti
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    
    // Tyhjennä localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('auth-storage');
    
    // Kirjaudu ulos Supabasesta ja ODOTA ennen redirectiä
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    
    // Tyhjennä myös Supabase session storagesta
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // Ohjaa etusivulle
    window.location.href = '/';
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

// Listen for auth state changes
if (isSupabaseConfigured()) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      // Älä kutsu logout() uudelleen - tyhjennä vain state
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        // Tyhjennä state
        useAuthStore.setState({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
      }
    } else if (event === 'SIGNED_IN' && session) {
      // Don't auto-check auth if we're on set-password page (let it handle its own flow)
      if (!window.location.pathname.includes('/set-password')) {
        useAuthStore.getState().checkAuth();
      }
    }
  });
}
