import axios from 'axios';
import type {
  User, Financier, Application, Offer, InfoRequest,
  Notification, AuthResponse, LeasingFormData, SaleLeasebackFormData
} from '../types';
import type { Contract, ContractCreateData } from '../types/contract';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for login/register endpoints - let the caller handle it
    const isAuthEndpoint = error.config?.url?.startsWith('/auth/login') || 
                           error.config?.url?.startsWith('/auth/register');
    
    // Don't clear demo tokens - they are client-side only
    const token = localStorage.getItem('token');
    const isDemoToken = token?.startsWith('demo-token-');
    
    if (error.response?.status === 401 && !isAuthEndpoint && !isDemoToken) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth - routes defined as /login, /register, /me, etc. (no trailing slash)
export const auth = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  register: (data: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    company_name?: string;
    business_id?: string;
  }) => api.post<AuthResponse>('/auth/register', data),
  
  me: () => api.get<User>('/auth/me'),
  
  verify: (token: string) => api.post(`/auth/verify/${token}`),
  
  resendVerification: () => api.post('/auth/resend-verification'),
};

// Users - Supabase-based
export const users = {
  list: async (role?: string) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    let query = supabase.from('profiles').select('*');
    if (role) {
      query = query.eq('role', role);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data: data || [], error };
  },
  
  get: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', String(id))
      .single();
    return { data, error };
  },
  
  updateMe: async (data: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    
    const { data: result, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
      .single();
    return { data: result, error };
  },
  
  createFinancierUser: async (data: any) => {
    // Financiers are created through Supabase Auth
    return { data: null, error: new Error('Use Supabase Auth to create users') };
  },
  
  activate: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
  
  deactivate: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
};

// Financiers - Supabase-based
export const financiers = {
  list: async (activeOnly = false) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    let query = supabase.from('profiles').select('*').eq('role', 'FINANCIER');
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    return { data, error };
  },
  
  listActive: async () => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'FINANCIER')
      .eq('is_active', true);
    return { data, error };
  },
  
  get: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', String(id))
      .single();
    return { data, error };
  },
  
  create: async (data: Partial<Financier>) => {
    // Financiers are created through auth.users, not directly
    return { data: null, error: new Error('Use Supabase Auth to create users') };
  },
  
  update: async (id: string | number, data: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data: result, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', String(id))
      .select()
      .single();
    return { data: result, error };
  },
  
  delete: async (id: string | number) => {
    // Users are deleted through Supabase Auth, not directly
    return { data: null, error: new Error('Use Supabase Auth to delete users') };
  },
};

// Applications - axios-based functions (kept for compatibility)
const applicationsAxios = {
  listAxios: (params?: { status_filter?: string; type_filter?: string }) =>
    api.get<Application[]>('/applications/', { params }),
  
  get: (id: number) => api.get<Application>(`/applications/${id}`),
  
  createLeasing: (data: LeasingFormData) =>
    api.post<Application>('/applications/leasing', data),
  
  createSaleLeaseback: (data: SaleLeasebackFormData) =>
    api.post<Application>('/applications/sale-leaseback', data),
  
  createPublicLeasing: (data: LeasingFormData) =>
    api.post<Application>('/applications/public/leasing', data),
  
  createPublicSaleLeaseback: (data: SaleLeasebackFormData) =>
    api.post<Application>('/applications/public/sale-leaseback', data),
  
  update: (id: number, data: Partial<Application>) =>
    api.put<Application>(`/applications/${id}`, data),
};

// Assignments
export const assignments = {
  create: (data: { application_id: number; financier_id: number; notes?: string }) =>
    api.post('/assignments/', data),
  
  getForApplication: (applicationId: number) =>
    api.get(`/assignments/application/${applicationId}`),
  
  delete: (id: number) => api.delete(`/assignments/${id}`),
};

// Info Requests
export const infoRequests = {
  create: (data: { application_id: number; message: string; requested_items?: string[] }) =>
    api.post<InfoRequest>('/info-requests/', data),
  
  getForApplication: (applicationId: number) =>
    api.get<InfoRequest[]>(`/info-requests/application/${applicationId}`),
  
  respond: (data: { info_request_id: number; message: string; attachment_ids?: number[] }) =>
    api.post<InfoRequest>('/info-requests/respond', data),
};

// Offers
export const offers = {
  create: async (data: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data: result, error } = await supabase
      .from('offers')
      .insert([data])
      .select()
      .single();
    return { data: result, error };
  },
  
  update: async (id: string | number, data: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data: result, error } = await supabase
      .from('offers')
      .update(data)
      .eq('id', String(id))
      .select()
      .single();
    return { data: result, error };
  },
  
  send: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('offers')
      .update({ status: 'SENT' })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
  
  approve: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('offers')
      .update({ status: 'SENT' })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
  
  accept: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('offers')
      .update({ status: 'ACCEPTED' })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
  
  reject: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('offers')
      .update({ status: 'REJECTED' })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
  
  getForApplication: async (applicationId: string | number) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('application_id', String(applicationId))
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },
  
  get: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', String(id))
      .single();
    return { data, error };
  },
  
  listAll: async () => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },
};

// Contracts - Supabase-based
export const contracts = {
  create: async (data: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data: result, error } = await supabase
      .from('contracts')
      .insert([data])
      .select()
      .single();
    return { data: result, error };
  },
  
  update: async (id: string | number, data: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data: result, error } = await supabase
      .from('contracts')
      .update(data)
      .eq('id', String(id))
      .select()
      .single();
    return { data: result, error };
  },
  
  upload: async (id: string | number, file: File) => {
    // File upload to Supabase Storage
    return { data: null, error: new Error('File upload not implemented') };
  },
  
  uploadLogo: async (id: string | number, file: File) => {
    return { data: null, error: new Error('Logo upload not implemented') };
  },
  
  send: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('contracts')
      .update({ status: 'SENT' })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
  
  sign: async (id: string | number, signaturePlace?: string, signerName?: string) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('contracts')
      .update({ 
        status: 'SIGNED',
        signed_at: new Date().toISOString()
      })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
  
  uploadSigned: async (id: string | number, file: File) => {
    return { data: null, error: new Error('Signed upload not implemented') };
  },
  
  getForApplication: async (applicationId: string | number) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('application_id', String(applicationId))
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },
  
  get: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', String(id))
      .single();
    return { data, error };
  },
  
  getAllAdmin: async () => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },
};

// Notifications - axios-based (kept for compatibility)
const notificationsAxios = {
  listAxios: (unreadOnly = false) =>
    api.get<Notification[]>('/notifications/', { params: { unread_only: unreadOnly } }),
  
  getUnreadCountAxios: () =>
    api.get<{ count: number }>('/notifications/unread-count'),
  
  markAsReadAxios: (id: number) => api.put(`/notifications/${id}/read`),
  
  markAllAsReadAxios: () => api.put('/notifications/read-all'),
};

// Files
export const files = {
  upload: (applicationId: number, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    return api.post(`/files/upload?application_id=${applicationId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getForApplication: (applicationId: number) =>
    api.get(`/files/application/${applicationId}`),
  
  download: (id: number) =>
    api.get(`/files/${id}/download`, { responseType: 'blob' }),
  
  delete: (id: number) => api.delete(`/files/${id}`),
};

// YTJ - Company Info (PRH Avoindata API) - Full data
export interface AddressInfo {
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country?: string | null;
}

export interface NameEntry {
  name: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
}

export interface BusinessLine {
  code: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface RegisterEntry {
  register: string;
  status: string;
  description: string | null;
  date: string | null;
}

export interface CompanySituation {
  type: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface CompanyInfo {
  // Basic info
  business_id: string;
  name: string | null;
  all_names?: NameEntry[];
  
  // Addresses
  visiting_address?: AddressInfo | null;
  postal_address?: AddressInfo | null;
  // Legacy fields for backwards compatibility
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  
  // Company form
  company_form: string | null;
  company_form_code?: string | null;
  
  // Business
  main_business: string | null;
  main_business_code?: string | null;
  business_lines?: BusinessLine[];
  
  // Contact info
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  
  // Register info
  registered_entries?: RegisterEntry[];
  
  // Situations
  company_situations?: CompanySituation[];
  
  // Status
  status?: string;
  trade_register_status?: string;
  is_active: boolean;
  is_liquidated: boolean;
  
  // Dates
  registration_date: string | null;
  end_date?: string | null;
}

export interface CompanySearchResult {
  business_id: string;
  name: string;
  company_form: string | null;
  is_active: boolean;
  is_liquidated: boolean;
}

export interface CompanySearchResponse {
  results: CompanySearchResult[];
  total: number;
}

export const ytj = {
  getCompanyInfo: (businessId: string) =>
    api.get<CompanyInfo>(`/ytj/${businessId}`),
  
  searchByName: (name: string, limit?: number) =>
    api.get<CompanySearchResponse>('/ytj/search/by-name', { 
      params: { name, limit: limit || 10 } 
    }),
};

// ============== SUPABASE-BASED FUNCTIONS ==============
// These work directly with Supabase, not through axios backend
import { supabase, isSupabaseConfigured } from './supabase';

// Messages (Supabase-based)
export const messages = {
  listByApplication: async (applicationId: string) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });
    return { data, error };
  },
  
  send: async (messageData: {
    application_id: string;
    message: string;
    sender_role: string;
    sender_id?: string;
    is_info_request?: boolean;
    is_read?: boolean;
    reply_to_id?: string;
    documents?: any;
  }) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    return { data, error };
  },
  
  markAsRead: async (id: string) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', id);
    return { data, error };
  }
};

// Applications export with Supabase-based functions
export const applications = {
  ...applicationsAxios,
  list: async (userId?: string, role?: string, email?: string) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    let query = supabase.from('applications').select('*');
    
    // For customers, filter by user_id or email
    if (role === 'CUSTOMER' && (userId || email)) {
      if (userId && email) {
        query = query.or(`user_id.eq.${userId},contact_email.ilike.${email}`);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else if (email) {
        query = query.ilike('contact_email', email);
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },
  create: async (applicationData: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: new Error('Supabase not configured') };
    
    const { data, error } = await supabase
      .from('applications')
      .insert([applicationData])
      .select()
      .single();
    
    return { data, error };
  },
  get: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const idStr = String(id);
    console.log('Fetching application with id:', idStr);
    
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', idStr)
      .single();
    
    if (error) {
      console.error('Error fetching application:', error);
    }
    
    return { data, error };
  },
  update: async (id: string | number, updateData: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const idStr = String(id);
    console.log('Updating application with id:', idStr, updateData);
    
    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', idStr)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating application:', error);
    }
    
    return { data, error };
  }
};

// Override notifications to use Supabase
const notificationsSupabase = {
  list: async (userId?: string) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    let query = supabase.from('notifications').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },
  
  getUnreadCount: async (userId?: string) => {
    if (!isSupabaseConfigured()) return { data: { count: 0 }, error: null };
    
    let query = supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { count, error } = await query;
    return { data: { count: count || 0 }, error };
  },
  
  markAsRead: async (id: string) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    return { data, error };
  },
  
  create: async (notificationData: {
    user_id: string;
    title: string;
    message: string;
    type: string;
    action_url?: string;
  }) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();
    return { data, error };
  },
  
  markAllAsRead: async (userId?: string) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    let query = supabase.from('notifications').update({ is_read: true });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    return { data, error };
  }
};

// Email Notifications (via Vercel Edge Function)
export const emailNotifications = {
  send: async (to: string, type: string, data?: { customerName?: string; message?: string; applicationRef?: string }) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, type, data })
      });
      if (!response.ok) {
        console.warn('Email notification failed:', response.status);
      }
      return response;
    } catch (error) {
      console.warn('Email notification error:', error);
      return null;
    }
  }
};

export { notificationsSupabase as notifications };

export default api;
