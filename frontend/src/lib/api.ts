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
// Assignments - Supabase-based (assignments stored as application metadata or separate table)
export const assignments = {
  create: async (data: { application_id: string; financier_id: string; notes?: string }) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    // Update application with assigned financier
    const { data: result, error } = await supabase
      .from('applications')
      .update({ 
        assigned_financier_id: data.financier_id,
        assignment_notes: data.notes 
      })
      .eq('id', data.application_id)
      .select()
      .single();
    return { data: result, error };
  },
  
  getForApplication: async (applicationId: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('applications')
      .select('assigned_financier_id, assignment_notes')
      .eq('id', String(applicationId))
      .single();
    return { data, error };
  },
  
  delete: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    // Remove assignment by clearing the financier
    const { data, error } = await supabase
      .from('applications')
      .update({ assigned_financier_id: null, assignment_notes: null })
      .eq('id', String(id))
      .select()
      .single();
    return { data, error };
  },
};

// Info Requests - Supabase-based (using app_messages table)
export const infoRequests = {
  create: async (data: { application_id: string; message: string; requested_items?: string[]; requested_documents?: string[] }) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get sender role from profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    
    const senderRole = senderProfile?.role || 'FINANCIER';
    
    const { data: result, error } = await supabase
      .from('app_messages')
      .insert([{
        application_id: data.application_id,
        message: data.message,
        sender_id: user?.id,
        sender_role: senderRole,
        is_info_request: true,
        requested_documents: data.requested_documents || null
      }])
      .select()
      .single();
    
    // Create notification for customer
    if (result && !error) {
      const { data: app } = await supabase
        .from('applications')
        .select('user_id, company_name')
        .eq('id', data.application_id)
        .single();
      
      if (app?.user_id) {
        const senderName = senderRole === 'FINANCIER' ? 'Rahoittaja' : 'Juuri Rahoitus';
        await supabase.from('notifications').insert({
          user_id: app.user_id,
          title: 'Lisätietopyyntö',
          message: `${senderName} pyytää lisätietoja hakemukseesi liittyen`
        });
      }
      
      // Update application status to INFO_REQUESTED
      await supabase
        .from('applications')
        .update({ status: 'INFO_REQUESTED' })
        .eq('id', data.application_id);
    }
    
    return { data: result, error };
  },
  
  getForApplication: async (applicationId: string | number) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('app_messages')
      .select('*')
      .eq('application_id', String(applicationId))
      .eq('is_info_request', true)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },
  
  // For financiers: only get messages they sent or replies to their messages
  getForFinancier: async (applicationId: string | number) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };
    
    // Get messages where financier is sender
    const { data: financierMessages, error: err1 } = await supabase
      .from('app_messages')
      .select('*')
      .eq('application_id', String(applicationId))
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });
    
    if (err1) return { data: [], error: err1 };
    
    // Get IDs of messages sent by financier
    const financierMessageIds = (financierMessages || []).map(m => m.id);
    
    // Get replies to financier's messages
    const { data: replies, error: err2 } = await supabase
      .from('app_messages')
      .select('*')
      .eq('application_id', String(applicationId))
      .in('parent_message_id', financierMessageIds.length > 0 ? financierMessageIds : ['no-match'])
      .order('created_at', { ascending: false });
    
    if (err2) return { data: [], error: err2 };
    
    // Combine and sort by date
    const allMessages = [...(financierMessages || []), ...(replies || [])];
    const uniqueMessages = allMessages.filter((msg, index, self) => 
      index === self.findIndex(m => m.id === msg.id)
    );
    uniqueMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return { data: uniqueMessages, error: null };
  },
  
  respond: async (data: { info_request_id: string; message: string; attachment_ids?: string[] }) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get the original info request to get application_id and sender info
    const { data: originalRequest } = await supabase
      .from('app_messages')
      .select('application_id, sender_id, sender_role')
      .eq('id', data.info_request_id)
      .single();
    
    if (!originalRequest) return { data: null, error: new Error('Info request not found') };
    
    // Create a response message
    const { data: result, error } = await supabase
      .from('app_messages')
      .insert([{
        application_id: originalRequest.application_id,
        message: data.message,
        sender_id: user?.id,
        sender_role: 'CUSTOMER',
        is_info_request: false,
        parent_message_id: data.info_request_id
      }])
      .select()
      .single();
    
    // Mark the original request as read and create notifications
    if (result && !error) {
      await supabase
        .from('app_messages')
        .update({ is_read: true })
        .eq('id', data.info_request_id);
      
      // Get application details for notification
      const { data: app } = await supabase
        .from('applications')
        .select('company_name')
        .eq('id', originalRequest.application_id)
        .single();
      
      const notificationsToCreate = [];
      
      // Notify the original sender (admin or financier)
      if (originalRequest.sender_id) {
        notificationsToCreate.push({
          user_id: originalRequest.sender_id,
          title: 'Vastaus lisätietopyyntöön',
          message: `${app?.company_name || 'Asiakas'} vastasi viestiisi`
        });
      }
      
      // Also notify all admins if the sender was a financier
      if (originalRequest.sender_role === 'FINANCIER') {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'ADMIN');
        
        if (admins) {
          for (const admin of admins) {
            if (admin.id !== originalRequest.sender_id) {
              notificationsToCreate.push({
                user_id: admin.id,
                title: 'Asiakkaan vastaus',
                message: `${app?.company_name || 'Asiakas'} vastasi lisätietopyyntöön`
              });
            }
          }
        }
      }
      
      // Notify all admins if the sender was admin (to track activity)
      if (originalRequest.sender_role === 'ADMIN') {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'ADMIN');
        
        if (admins) {
          for (const admin of admins) {
            if (admin.id !== originalRequest.sender_id) {
              notificationsToCreate.push({
                user_id: admin.id,
                title: 'Asiakkaan vastaus',
                message: `${app?.company_name || 'Asiakas'} vastasi viestiin`
              });
            }
          }
        }
      }
      
      if (notificationsToCreate.length > 0) {
        await supabase.from('notifications').insert(notificationsToCreate);
      }
      
      // Update application status to INFO_RECEIVED
      await supabase
        .from('applications')
        .update({ status: 'INFO_RECEIVED' })
        .eq('id', originalRequest.application_id);
    }
    
    return { data: result, error };
  },
};

// Offers
export const offers = {
  create: async (data: any) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    try {
      // Get current user to set financier_id
      const { data: { user } } = await supabase.auth.getUser();
      
      // Clean up data - remove undefined values
      const cleanData: any = {
        application_id: data.application_id,
        monthly_payment: data.monthly_payment,
        term_months: data.term_months,
        financier_id: user?.id,
        status: data.status || 'DRAFT'
      };
      
      // Add optional fields only if they have values
      if (data.upfront_payment) cleanData.upfront_payment = data.upfront_payment;
      if (data.residual_value) cleanData.residual_value = data.residual_value;
      if (data.notes) cleanData.notes = data.notes;
      if (data.notes_to_customer) cleanData.notes_to_customer = data.notes_to_customer;
      if (data.internal_notes) cleanData.internal_notes = data.internal_notes;
      if (data.included_services) cleanData.included_services = data.included_services;
      
      console.log('Creating offer with data:', cleanData);
      
      const { data: result, error } = await supabase
        .from('offers')
        .insert([cleanData])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating offer:', error);
        return { data: null, error };
      }
      
      return { data: result, error: null };
    } catch (e) {
      console.error('Unexpected error creating offer:', e);
      return { data: null, error: e };
    }
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
    
    // Get offer with application details first
    const { data: offer } = await supabase
      .from('offers')
      .select('application_id')
      .eq('id', String(id))
      .single();
    
    const { data, error } = await supabase
      .from('offers')
      .update({ status: 'SENT' })
      .eq('id', String(id))
      .select()
      .single();
    
    // Create notification for customer
    if (data && !error && offer?.application_id) {
      const { data: app } = await supabase
        .from('applications')
        .select('user_id, company_name')
        .eq('id', offer.application_id)
        .single();
      
      if (app?.user_id) {
        await supabase.from('notifications').insert({
          user_id: app.user_id,
          title: 'Uusi tarjous!',
          message: 'Sait rahoitustarjouksen hakemukseesi'
        });
      }
      
      // Update application status
      await supabase
        .from('applications')
        .update({ status: 'OFFER_SENT' })
        .eq('id', offer.application_id);
    }
    
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
    
    try {
      // Get offer details first (simple query without join)
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', String(id))
        .single();
      
      if (offerError) {
        console.error('Error fetching offer:', offerError);
        return { data: null, error: offerError };
      }
      
      // Update offer status
      const { data, error } = await supabase
        .from('offers')
        .update({ status: 'ACCEPTED' })
        .eq('id', String(id))
        .select()
        .single();
      
      if (error) {
        console.error('Error updating offer:', error);
        return { data: null, error };
      }
      
      // Update application status
      if (offer?.application_id) {
        await supabase
          .from('applications')
          .update({ status: 'OFFER_ACCEPTED' })
          .eq('id', offer.application_id);
      }
      
      // Create notifications (fire and forget)
      try {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'ADMIN');
        
        const notifs = [];
        if (admins) {
          for (const admin of admins) {
            notifs.push({ user_id: admin.id, title: 'Tarjous hyväksytty', message: 'Asiakas hyväksyi tarjouksen' });
          }
        }
        if (offer?.financier_id) {
          notifs.push({ user_id: offer.financier_id, title: 'Tarjous hyväksytty', message: 'Asiakas hyväksyi tarjouksesi' });
        }
        if (notifs.length > 0) {
          await supabase.from('notifications').insert(notifs);
        }
      } catch (e) {
        console.warn('Failed to create notifications:', e);
      }
      
      return { data, error: null };
    } catch (e) {
      console.error('Unexpected error in accept:', e);
      return { data: null, error: e };
    }
  },
  
  reject: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    try {
      // Get offer details first
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', String(id))
        .single();
      
      if (offerError) {
        console.error('Error fetching offer:', offerError);
        return { data: null, error: offerError };
      }
      
      // Update offer status
      const { data, error } = await supabase
        .from('offers')
        .update({ status: 'REJECTED' })
        .eq('id', String(id))
        .select()
        .single();
      
      if (error) {
        console.error('Error updating offer:', error);
        return { data: null, error };
      }
      
      // Create notifications (fire and forget)
      try {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'ADMIN');
        
        const notifs = [];
        if (admins) {
          for (const admin of admins) {
            notifs.push({ user_id: admin.id, title: 'Tarjous hylätty', message: 'Asiakas hylkäsi tarjouksen' });
          }
        }
        if (offer?.financier_id) {
          notifs.push({ user_id: offer.financier_id, title: 'Tarjous hylätty', message: 'Asiakas hylkäsi tarjouksesi' });
        }
        if (notifs.length > 0) {
          await supabase.from('notifications').insert(notifs);
        }
      } catch (e) {
        console.warn('Failed to create notifications:', e);
      }
      
      return { data, error: null };
    } catch (e) {
      console.error('Unexpected error in reject:', e);
      return { data: null, error: e };
    }
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
    
    // Get contract with application details first
    const { data: contract } = await supabase
      .from('contracts')
      .select('application_id')
      .eq('id', String(id))
      .single();
    
    const { data, error } = await supabase
      .from('contracts')
      .update({ status: 'SENT', sent_at: new Date().toISOString() })
      .eq('id', String(id))
      .select()
      .single();
    
    // Create notification for customer
    if (data && !error && contract?.application_id) {
      const { data: app } = await supabase
        .from('applications')
        .select('user_id, company_name')
        .eq('id', contract.application_id)
        .single();
      
      if (app?.user_id) {
        await supabase.from('notifications').insert({
          user_id: app.user_id,
          title: 'Sopimus allekirjoitettavaksi',
          message: 'Rahoitussopimus odottaa allekirjoitustasi'
        });
      }
      
      // Update application status
      await supabase
        .from('applications')
        .update({ status: 'CONTRACT_SENT' })
        .eq('id', contract.application_id);
    }
    
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
  upload: async (applicationId: string | number, file: File, description?: string) => {
    // File upload to Supabase Storage - return empty for now
    console.log('File upload not implemented yet:', applicationId, file.name);
    return { data: null, error: null };
  },
  
  list: async (applicationId: string | number) => {
    // Return empty array - file storage not implemented yet
    return { data: [], error: null };
  },
  
  getForApplication: async (applicationId: string | number) => {
    return { data: [], error: null };
  },
  
  download: async (id: string | number) => {
    return { data: null, error: null };
  },
  
  delete: async (id: string | number) => {
    return { data: null, error: null };
  },
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

// Messages (Supabase-based - using app_messages table)
export const messages = {
  listByApplication: async (applicationId: string) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    const { data, error } = await supabase
      .from('app_messages')
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
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Map reply_to_id to parent_message_id for database
    const { reply_to_id, documents, ...rest } = messageData;
    
    const insertData: any = {
      ...rest,
      sender_id: messageData.sender_id || user?.id
    };
    
    // Add parent_message_id if reply_to_id is provided
    if (reply_to_id) {
      insertData.parent_message_id = reply_to_id;
    }
    
    const { data, error } = await supabase
      .from('app_messages')
      .insert(insertData)
      .select()
      .single();
    
    // Create notifications based on sender role
    if (data && !error) {
      // Get application details
      const { data: app } = await supabase
        .from('applications')
        .select('company_name, user_id')
        .eq('id', messageData.application_id)
        .single();
      
      const notificationsToCreate = [];
      const companyName = app?.company_name || 'Asiakas';
      
      if (messageData.sender_role === 'CUSTOMER') {
        // Customer sent message
        // If replying to a message, only notify the ORIGINAL SENDER (not all financiers!)
        if (reply_to_id) {
          // Get the original message to find out who sent it
          const { data: originalMessage } = await supabase
            .from('app_messages')
            .select('sender_id, sender_role')
            .eq('id', reply_to_id)
            .single();
          
          if (originalMessage?.sender_id) {
            // Notify the original sender
            notificationsToCreate.push({
              user_id: originalMessage.sender_id,
              title: 'Asiakas vastasi viestiin',
              message: `${companyName} vastasi viestiisi`
            });
            
            // If original sender was a financier, also notify admins for tracking
            if (originalMessage.sender_role === 'FINANCIER') {
              const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'ADMIN');
              
              if (admins) {
                for (const admin of admins) {
                  notificationsToCreate.push({
                    user_id: admin.id,
                    title: 'Asiakas vastasi rahoittajalle',
                    message: `${companyName} vastasi rahoittajan viestiin`
                  });
                }
              }
            }
          }
        } else {
          // New message (not a reply) - only notify admins, NOT all financiers
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'ADMIN');
          
          if (admins) {
            for (const admin of admins) {
              notificationsToCreate.push({
                user_id: admin.id,
                title: 'Uusi viesti asiakkaalta',
                message: `${companyName} lähetti viestin`
              });
            }
          }
        }
      } else {
        // Admin/Financier sent message - notify customer
        if (app?.user_id) {
          notificationsToCreate.push({
            user_id: app.user_id,
            title: messageData.is_info_request ? 'Lisätietopyyntö' : 'Uusi viesti',
            message: messageData.is_info_request ? 'Sinulle on lisätietopyyntö hakemukseesi' : 'Sait uuden viestin hakemukseesi'
          });
        }
      }
      
      if (notificationsToCreate.length > 0) {
        await supabase.from('notifications').insert(notificationsToCreate);
      }
    }
    
    return { data, error };
  },
  
  markAsRead: async (id: string) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    const { data, error } = await supabase
      .from('app_messages')
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
    
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating application:', error);
        return { data: null, error };
      }
      
      // Create notifications for all admins
      try {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'ADMIN');
        
        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'Uusi hakemus',
            message: `Uusi rahoitushakemus: ${applicationData.company_name || 'Uusi yritys'}`
          }));
          
          await supabase.from('notifications').insert(notifications);
        }
      } catch (notifError) {
        console.warn('Failed to create admin notifications:', notifError);
      }
      
      return { data, error: null };
    } catch (e) {
      console.error('Unexpected error creating application:', e);
      return { data: null, error: e };
    }
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
