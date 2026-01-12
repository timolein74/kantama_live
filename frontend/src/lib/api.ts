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

// Email notification helper - calls Edge Function
const EDGE_FUNCTION_URL = 'https://iquhgqeicalsrsfzdopd.supabase.co/functions/v1/send-notification-email';

// Test function - call from browser console: testEmailFunction('your@email.com')
(window as any).testEmailFunction = async (email: string) => {
  console.log('🧪 Testing email to:', email);
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: email,
      subject: 'Testi - Juuri Rahoitus',
      type: 'message',
      customer_name: 'Testi',
    }),
  });
  const data = await response.json();
  console.log('Response:', response.status, data);
  return data;
};

export const sendNotificationEmail = async (params: {
  to: string;
  subject: string;
  type: 'offer' | 'info_request' | 'message' | 'contract';
  customer_name?: string;
  company_name?: string;
  html?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> => {
  console.log('📧 [EMAIL] Attempting to send email:', {
    to: params.to,
    subject: params.subject,
    type: params.type,
    url: EDGE_FUNCTION_URL
  });
  
  if (!params.to) {
    console.error('❌ [EMAIL] No recipient email provided!');
    return { success: false, error: 'Vastaanottajan sähköposti puuttuu' };
  }
  
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ [EMAIL] Edge Function returned error:', response.status, data);
      return { 
        success: false, 
        error: data.error || `HTTP ${response.status}: ${response.statusText}` 
      };
    }
    
    if (data.error) {
      console.error('❌ [EMAIL] Email service error:', data.error);
      return { success: false, error: data.error };
    }
    
    console.log('✅ [EMAIL] Email sent successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ [EMAIL] Network/fetch error:', error);
    return { 
      success: false, 
      error: error.message || 'Verkkovirhe sähköpostin lähetyksessä' 
    };
  }
};

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
  
  invite: async (data: { email: string; name: string; phone?: string; company_name?: string; business_id?: string }) => {
    if (!isSupabaseConfigured()) return { data: null, error: new Error('Supabase not configured') };
    
    try {
      const tempPassword = `Temp${Date.now()}!${Math.random().toString(36).slice(2, 10)}`;
      
      // Create user with signUp
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: tempPassword,
        options: {
          data: {
            first_name: data.name.split(' ')[0],
            last_name: data.name.split(' ').slice(1).join(' ') || null,
            role: 'FINANCIER'
          },
          emailRedirectTo: 'https://juurirahoitus.fi/set-password'
        }
      });
      
      if (signUpError) {
        console.error('SignUp error:', signUpError);
        return { data: null, error: signUpError };
      }
      
      if (!authData.user) {
        return { data: null, error: new Error('Failed to create user') };
      }
      
      // Create profile
      const nameParts = data.name.split(' ');
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: data.email,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ') || null,
        role: 'FINANCIER',
        is_active: true,
        is_verified: false,
        phone: data.phone || null,
        company_name: data.company_name || null,
        business_id: data.business_id || null
      });
      
      // Send custom welcome email for financier via Edge Function
      try {
        await sendNotificationEmail({
          to: data.email,
          subject: 'Tervetuloa Juuri Rahoitus -portaaliin',
          type: 'message',
          html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;">
            <div style="text-align:center;margin-bottom:20px;">
              <div style="background:#059669;color:white;width:50px;height:50px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;">J</div>
            </div>
            <h2 style="color:#1e293b;text-align:center;">Tervetuloa Juuri Rahoitukseen!</h2>
            <p style="color:#475569;">Hei ${data.name},</p>
            <p style="color:#475569;">Sinut on kutsuttu rahoittajaksi Juuri Rahoitus -portaaliin.</p>
            <p style="color:#475569;"><strong>Näin pääset alkuun:</strong></p>
            <ol style="color:#475569;">
              <li><strong>Vahvista sähköposti</strong> - Tarkista sähköpostisi Supabaselta tulleesta viestistä ja klikkaa vahvistuslinkkiä</li>
              <li><strong>Aseta salasana</strong> - Vahvistuksen jälkeen pääset asettamaan salasanan</li>
              <li><strong>Kirjaudu sisään</strong> - Tee tarjouksia ja luottopäätöksiä asiakkaille</li>
            </ol>
            <p style="color:#94a3b8;font-size:12px;margin-top:30px;">Juuri Rahoitus Oy</p>
          </div>`
        });
      } catch (emailError) {
        console.log('Custom email failed, Supabase default email was sent:', emailError);
      }
      
      return { data: { user_id: authData.user.id, message: 'Kutsu lähetetty!' }, error: null };
    } catch (e: any) {
      console.error('Invite financier error:', e);
      return { data: null, error: e };
    }
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
    console.log('📨 infoRequests.create called with:', data);
    
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase not configured!');
      return { data: null, error: new Error('Supabase not configured') };
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current user:', user?.id, user?.email, 'Error:', userError);
    
    // Get sender role from profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    
    const senderRole = senderProfile?.role || 'FINANCIER';
    console.log('📝 Sender role:', senderRole);
    
    // Build insert data - try with requested_documents first, fallback without
    const baseInsertData = {
      application_id: data.application_id,
      message: data.message,
      sender_id: user?.id,
      sender_role: senderRole,
      is_info_request: true
    };
    
    // Try with requested_documents if provided
    let result = null;
    let error = null;
    
    if (data.requested_documents && data.requested_documents.length > 0) {
      console.log('📝 Trying insert with requested_documents:', data.requested_documents);
      const insertWithDocs = {
        ...baseInsertData,
        requested_documents: data.requested_documents
      };
      
      const response = await supabase
        .from('app_messages')
        .insert([insertWithDocs])
        .select()
        .single();
      
      result = response.data;
      error = response.error;
      
      // If failed due to column issue, try without requested_documents
      if (error && error.message?.includes('requested_documents')) {
        console.log('⚠️ Retrying without requested_documents column');
        const fallbackResponse = await supabase
          .from('app_messages')
          .insert([baseInsertData])
          .select()
          .single();
        
        result = fallbackResponse.data;
        error = fallbackResponse.error;
      }
    } else {
      console.log('📝 Inserting without requested_documents');
      const response = await supabase
        .from('app_messages')
        .insert([baseInsertData])
        .select()
        .single();
      
      result = response.data;
      error = response.error;
    }
    
    console.log('📝 Insert result:', result, 'Error:', error);
    
    // Create notification for customer and send email
    if (result && !error) {
      console.log('✅ [INFO_REQUEST] Message created successfully, now sending notification...');
      
      const { data: app } = await supabase
        .from('applications')
        .select('user_id, company_name, contact_email, contact_person')
        .eq('id', data.application_id)
        .single();
      
      console.log('📨 [INFO_REQUEST] Application data:', app);
      
      const senderName = senderRole === 'FINANCIER' ? 'Rahoittaja' : 'Juuri Rahoitus';
      
      // Create in-app notification if user_id exists
      if (app?.user_id) {
        await supabase.from('notifications').insert({
          user_id: app.user_id,
          title: 'Lisätietopyyntö',
          message: `${senderName} pyytää lisätietoja hakemukseesi liittyen`
        });
        console.log('✅ [INFO_REQUEST] In-app notification created');
      } else {
        console.log('ℹ️ [INFO_REQUEST] No user_id, skipping in-app notification');
      }
      
      // ALWAYS send email if contact_email exists (regardless of user_id)
      if (app?.contact_email) {
        console.log('📧 [INFO_REQUEST] Sending email to:', app.contact_email);
        const emailResult = await sendNotificationEmail({
          to: app.contact_email,
          subject: 'Lisätietopyyntö hakemukseesi - Juuri Rahoitus',
          type: 'info_request',
          customer_name: app.contact_person || undefined,
          company_name: app.company_name || undefined,
        });
        
        if (!emailResult.success) {
          console.error('❌ [INFO_REQUEST] EMAIL FAILED:', emailResult.error);
        } else {
          console.log('✅ [INFO_REQUEST] Email sent successfully');
        }
      } else {
        console.warn('⚠️ [INFO_REQUEST] No contact_email found for application!');
      }
      
      // Update application status to INFO_REQUESTED
      await supabase
        .from('applications')
        .update({ status: 'INFO_REQUESTED' })
        .eq('id', data.application_id);
    } else {
      console.error('❌ [INFO_REQUEST] Insert failed or returned no data!', { result, error: error?.message });
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
  
  // For financiers: get ALL messages for an application (both from financier and customer)
  getForFinancier: async (applicationId: string | number) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    // Get ALL messages for this application
    const { data: allMessages, error } = await supabase
      .from('app_messages')
      .select('*')
      .eq('application_id', String(applicationId))
      .order('created_at', { ascending: true }); // oldest first for conversation flow
    
    if (error) return { data: [], error };
    
    // Group messages: parent messages and their replies
    const parentMessages = (allMessages || []).filter(m => !m.parent_message_id);
    const replies = (allMessages || []).filter(m => m.parent_message_id);
    
    // Attach replies to their parent messages
    const messagesWithReplies = parentMessages.map(parent => ({
      ...parent,
      responses: replies.filter(r => r.parent_message_id === parent.id)
    }));
    
    // Sort by newest first for display
    messagesWithReplies.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return { data: messagesWithReplies, error: null };
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
      
      // Notify the original sender (admin or financier) and send email
      if (originalRequest.sender_id) {
        notificationsToCreate.push({
          user_id: originalRequest.sender_id,
          title: 'Vastaus lisätietopyyntöön',
          message: `${app?.company_name || 'Asiakas'} vastasi viestiisi`
        });
        
        // Send email to the financier/admin who requested the info
        const { data: sender } = await supabase
          .from('profiles')
          .select('email, first_name, role')
          .eq('id', originalRequest.sender_id)
          .single();
        
        if (sender?.email) {
          try {
            await sendNotificationEmail({
              to: sender.email,
              subject: 'Asiakas toimitti lisätiedot - Juuri Rahoitus',
              type: 'info_request',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #059669;">📎 Lisätiedot toimitettu!</h2>
                  <p>Hei ${sender.first_name || ''},</p>
                  <p>Asiakas <strong>${app?.company_name || 'Yritys'}</strong> on vastannut lisätietopyyntöösi ja toimittanut pyydetyt dokumentit.</p>
                  <p><a href="https://juurirahoitus.fi/financier/applications/${originalRequest.application_id}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Avaa hakemus ja tarkista liitteet</a></p>
                  <p style="color: #666; font-size: 12px; margin-top: 20px;">Juuri Rahoitus Oy</p>
                </div>
              `
            });
            console.log('✅ Email sent to financier about info request response:', sender.email);
          } catch (emailErr) {
            console.warn('Failed to send email to financier:', emailErr);
          }
        }
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
      
      console.log('Creating offer with direct INSERT, data:', data);
      
      // Step 1: Insert only core fields (schema cache issues with optional text fields)
      const insertData: any = {
        application_id: data.application_id,
        monthly_payment: data.monthly_payment,
        term_months: data.term_months,
        financier_id: user?.id || null,
        status: data.status || 'DRAFT',
        upfront_payment: data.upfront_payment || 0,
        residual_value: data.residual_value || 0,
        notes: data.notes || null,
        created_at: new Date().toISOString()
      };
      
      const { data: result, error } = await supabase
        .from('offers')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating offer:', error);
        return { data: null, error };
      }
      
      console.log('Offer created successfully:', result);
      
      // Step 2: Update optional text fields using RPC (bypasses schema cache)
      if (data.notes_to_customer || data.internal_notes || data.included_services) {
        const { error: rpcError } = await supabase.rpc('update_offer_text_fields', {
          p_offer_id: result.id,
          p_notes_to_customer: data.notes_to_customer || null,
          p_internal_notes: data.internal_notes || null,
          p_included_services: data.included_services || null
        });
        
        if (rpcError) {
          console.warn('Could not update optional text fields:', rpcError);
          // Continue anyway - the core offer was created
        } else {
          console.log('Optional text fields updated successfully');
        }
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
    console.log('📤 [OFFER.SEND] Called with id:', id);
    
    if (!isSupabaseConfigured()) {
      console.error('❌ [OFFER.SEND] Supabase not configured!');
      return { data: null, error: null };
    }
    
    // Get offer with application details first
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('application_id')
      .eq('id', String(id))
      .single();
    
    console.log('📤 [OFFER.SEND] Offer query result:', { offer, offerError });
    
    if (offerError) {
      console.error('❌ [OFFER.SEND] Failed to get offer:', offerError);
    }
    
    const { data, error } = await supabase
      .from('offers')
      .update({ status: 'SENT' })
      .eq('id', String(id))
      .select()
      .single();
    
    console.log('📤 [OFFER.SEND] Update result:', { data, error });
    
    // Create notification for customer and send email
    if (data && !error && offer?.application_id) {
      console.log('📤 [OFFER.SEND] Getting application:', offer.application_id);
      
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select('user_id, company_name, contact_email, contact_person')
        .eq('id', offer.application_id)
        .single();
      
      console.log('📤 [OFFER.SEND] Application data:', { app, appError });
      
      // Create in-app notification if user_id exists
      if (app?.user_id) {
        console.log('📤 [OFFER.SEND] Creating notification for user:', app.user_id);
        
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: app.user_id,
          title: 'Uusi tarjous!',
          message: 'Sait rahoitustarjouksen hakemukseesi'
        });
        
        if (notifError) {
          console.error('❌ [OFFER.SEND] Notification insert failed:', notifError);
        } else {
          console.log('✅ [OFFER.SEND] Notification created');
        }
      } else {
        console.log('ℹ️ [OFFER.SEND] No user_id, skipping in-app notification');
      }
      
      // ALWAYS send email if contact_email exists (regardless of user_id)
      if (app?.contact_email) {
        console.log('📧 [OFFER.SEND] Sending email to:', app.contact_email);
        const emailResult = await sendNotificationEmail({
          to: app.contact_email,
          subject: 'Uusi rahoitustarjous - Juuri Rahoitus',
          type: 'offer',
          customer_name: app.contact_person || undefined,
          company_name: app.company_name || undefined,
        });
        if (!emailResult.success) {
          console.error('❌ [OFFER.SEND] EMAIL FAILED:', emailResult.error);
        } else {
          console.log('✅ [OFFER.SEND] Email sent successfully');
        }
      } else {
        console.warn('⚠️ [OFFER.SEND] No contact_email found!');
      }
      
      // Update application status
      await supabase
        .from('applications')
        .update({ status: 'OFFER_SENT' })
        .eq('id', offer.application_id);
    } else {
      console.error('❌ [OFFER.SEND] Condition failed:', { 
        hasData: !!data, 
        hasError: !!error, 
        applicationId: offer?.application_id 
      });
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
      
      // Create notifications and send email to financier
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
          
          // Send email to financier
          const { data: financier } = await supabase
            .from('profiles')
            .select('email, first_name')
            .eq('id', offer.financier_id)
            .single();
          
          if (financier?.email) {
            // Get application details for email
            const { data: app } = await supabase
              .from('applications')
              .select('company_name, equipment_price')
              .eq('id', offer.application_id)
              .single();
            
            await sendNotificationEmail({
              to: financier.email,
              subject: 'Tarjous hyväksytty - Asiakas pyytää luottopäätöstä',
              type: 'offer',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #059669;">🎉 Tarjous hyväksytty!</h2>
                  <p>Hei ${financier.first_name || ''},</p>
                  <p>Asiakas <strong>${app?.company_name || 'Yritys'}</strong> on hyväksynyt tarjouksesi ja pyytää virallista luottopäätöstä.</p>
                  <ul>
                    <li><strong>Yritys:</strong> ${app?.company_name || '-'}</li>
                    <li><strong>Summa:</strong> ${app?.equipment_price?.toLocaleString('fi-FI')} €</li>
                    <li><strong>Kuukausimaksu:</strong> ${offer.monthly_payment?.toLocaleString('fi-FI')} €</li>
                  </ul>
                  <p><strong>Seuraava askel:</strong> Pyydä tarvittavat dokumentit luottopäätöstä varten.</p>
                  <p><a href="https://juurirahoitus.fi/financier/applications/${offer.application_id}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Avaa hakemus</a></p>
                  <p style="color: #666; font-size: 12px; margin-top: 20px;">Juuri Rahoitus Oy</p>
                </div>
              `
            });
            console.log('✅ Email sent to financier about accepted offer:', financier.email);
          }
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
    
    // Update contract status - try with sent_at, fallback without if column doesn't exist
    let data = null;
    let error = null;
    
    try {
      const response = await supabase
        .from('contracts')
        .update({ status: 'SENT', sent_at: new Date().toISOString() })
        .eq('id', String(id))
        .select()
        .single();
      data = response.data;
      error = response.error;
      
      // If sent_at column doesn't exist, retry without it
      if (error?.message?.includes('sent_at')) {
        console.log('⚠️ sent_at column not found, retrying without it');
        const fallbackResponse = await supabase
          .from('contracts')
          .update({ status: 'SENT' })
          .eq('id', String(id))
          .select()
          .single();
        data = fallbackResponse.data;
        error = fallbackResponse.error;
      }
    } catch (e) {
      console.error('Contract update error:', e);
    }
    
    // Create notification for customer and send email
    if (data && !error && contract?.application_id) {
      const { data: app } = await supabase
        .from('applications')
        .select('user_id, company_name, contact_email, contact_person')
        .eq('id', contract.application_id)
        .single();
      
      // Create in-app notification if user_id exists
      if (app?.user_id) {
        await supabase.from('notifications').insert({
          user_id: app.user_id,
          title: 'Sopimus allekirjoitettavaksi',
          message: 'Rahoitussopimus odottaa allekirjoitustasi'
        });
        console.log('✅ [CONTRACT] In-app notification created');
      } else {
        console.log('ℹ️ [CONTRACT] No user_id, skipping in-app notification');
      }
      
      // ALWAYS send email if contact_email exists (regardless of user_id)
      if (app?.contact_email) {
        console.log('📧 [CONTRACT] Sending email to:', app.contact_email);
        const emailResult = await sendNotificationEmail({
          to: app.contact_email,
          subject: 'Sopimus allekirjoitettavaksi - Juuri Rahoitus',
          type: 'contract',
          customer_name: app.contact_person || undefined,
          company_name: app.company_name || undefined,
        });
        if (!emailResult.success) {
          console.error('❌ [CONTRACT] EMAIL FAILED:', emailResult.error);
        } else {
          console.log('✅ [CONTRACT] Email sent successfully');
        }
      } else {
        console.warn('⚠️ [CONTRACT] No contact_email found!');
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
  
  // Customer accepts contract for signing (triggers Visma Sign process)
  acceptForSigning: async (id: string | number) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    // Get contract with application details
    const { data: contract } = await supabase
      .from('contracts')
      .select('application_id')
      .eq('id', String(id))
      .single();
    
    if (!contract) return { data: null, error: new Error('Contract not found') };
    
    // Update contract status to "WAITING_SIGNATURE"
    const { data, error } = await supabase
      .from('contracts')
      .update({ 
        status: 'WAITING_SIGNATURE',
        accepted_for_signing_at: new Date().toISOString()
      })
      .eq('id', String(id))
      .select()
      .single();
    
    if (error) {
      // If column doesn't exist, retry without accepted_for_signing_at
      if (error.message?.includes('accepted_for_signing_at')) {
        const fallbackResponse = await supabase
          .from('contracts')
          .update({ status: 'WAITING_SIGNATURE' })
          .eq('id', String(id))
          .select()
          .single();
        if (fallbackResponse.error) return { data: null, error: fallbackResponse.error };
      } else {
        return { data: null, error };
      }
    }
    
    // IMPORTANT: Update application status to WAITING_SIGNATURE so dashboard notification disappears
    await supabase
      .from('applications')
      .update({ status: 'WAITING_SIGNATURE' })
      .eq('id', contract.application_id);
    
    // Get application details for notifications
    const { data: app } = await supabase
      .from('applications')
      .select('company_name, contact_person, financier_id')
      .eq('id', contract.application_id)
      .single();
    
    // Get offer to find the financier who sent it
    const { data: offer } = await supabase
      .from('offers')
      .select('financier_id')
      .eq('application_id', contract.application_id)
      .eq('status', 'ACCEPTED')
      .single();
    
    const financierId = offer?.financier_id || app?.financier_id;
    
    // Notify the financier
    if (financierId) {
      await supabase.from('notifications').insert({
        user_id: financierId,
        title: '🎉 Asiakas hyväksyi sopimuksen allekirjoitukseen!',
        message: `${app?.company_name || 'Asiakas'} on hyväksynyt sopimuksen ja odottaa Visma Sign -linkkiä`
      });
      
      // Send email to financier
      const { data: financier } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', financierId)
        .single();
      
      if (financier?.email) {
        try {
          await sendNotificationEmail({
            to: financier.email,
            subject: '🎉 Asiakas hyväksyi sopimuksen allekirjoitukseen - Juuri Rahoitus',
            type: 'contract_accepted',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                  <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                  <h2 style="margin: 0; font-size: 24px;">Sopimus hyväksytty allekirjoitukseen!</h2>
                </div>
                <p style="color: #374151;">Hei ${financier.first_name || ''},</p>
                <p style="color: #374151;"><strong>${app?.company_name || 'Asiakas'}</strong> on hyväksynyt sopimuksen ja odottaa Visma Sign -allekirjoituslinkkiä.</p>
                <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #166534;"><strong>Seuraava vaihe:</strong> Lähetä asiakkaalle Visma Sign -allekirjoituslinkki.</p>
                </div>
                <p><a href="https://juurirahoitus.fi/financier/applications/${contract.application_id}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Avaa hakemus</a></p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Juuri Rahoitus Oy</p>
              </div>
            `
          });
          console.log('✅ Email sent to financier about contract acceptance');
        } catch (emailErr) {
          console.warn('Failed to send email to financier:', emailErr);
        }
      }
    }
    
    // Also notify admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'ADMIN');
    
    if (admins && admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        user_id: admin.id,
        title: '🎉 Asiakas hyväksyi sopimuksen',
        message: `${app?.company_name || 'Asiakas'} odottaa Visma Sign -linkkiä`
      }));
      await supabase.from('notifications').insert(adminNotifications);
    }
    
    // Update application status
    await supabase
      .from('applications')
      .update({ status: 'CONTRACT_ACCEPTED' })
      .eq('id', contract.application_id);
    
    return { data, error: null };
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
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured for file upload');
      return { data: null, error: new Error('Storage not configured') };
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'anonymous';
      
      // Create unique file path
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `applications/${applicationId}/${timestamp}_${safeName}`;
      
      console.log('📤 Uploading file:', filePath);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { data: null, error: uploadError };
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      console.log('✅ File uploaded to storage:', uploadData.path);
      
      // Save file metadata to application_files table
      const { data: fileRecord, error: dbError } = await supabase
        .from('application_files')
        .insert({
          application_id: String(applicationId),
          file_name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          description: description || null,
          uploaded_by: userId
        })
        .select()
        .single();
      
      if (dbError) {
        console.error('Database insert error:', dbError);
        // File is uploaded but not tracked in DB - still return success
        console.warn('⚠️ File uploaded to storage but not tracked in database');
      } else {
        console.log('✅ File record saved to database:', fileRecord.id);
      }
      
      return { 
        data: { 
          id: fileRecord?.id || uploadData.path,
          path: uploadData.path,
          url: urlData.publicUrl,
          name: file.name,
          size: file.size,
          type: file.type
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Unexpected upload error:', error);
      return { data: null, error };
    }
  },
  
  list: async (applicationId: string | number) => {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    try {
      console.log('📂 Fetching files for application:', applicationId);
      
      // Fetch from application_files table
      const { data, error } = await supabase
        .from('application_files')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
      
      console.log('📂 application_files query result:', { data, error });
      
      if (error) {
        console.error('📂 Error fetching files:', error);
        return { data: [], error };
      }
      
      // Map to expected format with URLs
      const filesWithUrls = (data || []).map(f => ({
        ...f,
        file_name: f.file_name || f.filename || f.name || 'Tiedosto',
        url: f.file_url || f.url || f.storage_path || `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documents/${f.storage_path || f.file_path || ''}`
      }));
      
      console.log('📂 Processed files:', filesWithUrls);
      
      return { data: filesWithUrls, error: null };
    } catch (error) {
      console.error('📂 Files list error:', error);
      return { data: [], error };
    }
  },
  
  getForApplication: async (applicationId: string | number) => {
    return files.list(applicationId);
  },
  
  download: async (path: string) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(path);
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  getUrl: (path: string) => {
    if (!isSupabaseConfigured()) return null;
    
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(path);
    
    return data.publicUrl;
  },
  
  delete: async (path: string) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .remove([path]);
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
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
    attachments?: string[];
  }) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Map reply_to_id to parent_message_id for database
    const { reply_to_id, documents, attachments, ...rest } = messageData;
    
    const insertData: any = {
      ...rest,
      sender_id: messageData.sender_id || user?.id
    };
    
    // Add parent_message_id if reply_to_id is provided
    if (reply_to_id) {
      insertData.parent_message_id = reply_to_id;
    }
    
    // Add attachments if provided
    const hasAttachments = attachments && attachments.length > 0;
    if (hasAttachments) {
      insertData.attachments = attachments;
    }
    
    // Try to insert - if attachments column fails, retry without it
    let data = null;
    let error = null;
    
    const response = await supabase
      .from('app_messages')
      .insert(insertData)
      .select()
      .single();
    
    data = response.data;
    error = response.error;
    
    // If failed due to attachments column cache issue, retry without attachments
    if (error && error.message?.includes('attachments') && hasAttachments) {
      console.warn('⚠️ Retrying without attachments due to schema cache issue');
      const { attachments: _, ...insertDataWithoutAttachments } = insertData;
      
      // Add attachment info to message text instead
      insertDataWithoutAttachments.message += `\n\n📎 Liitteet: ${attachments.length} kpl`;
      
      const retryResponse = await supabase
        .from('app_messages')
        .insert(insertDataWithoutAttachments)
        .select()
        .single();
      
      data = retryResponse.data;
      error = retryResponse.error;
    }
    
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
          // New message (not a reply) - notify admins AND the financier assigned to the application
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
          
          // Also notify ALL financiers about the customer's message
          const { data: financiers } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('role', 'FINANCIER');
          
          if (financiers && financiers.length > 0) {
            for (const financier of financiers) {
              notificationsToCreate.push({
                user_id: financier.id,
                title: 'Asiakas lähetti viestin',
                message: `${companyName} lähetti kysymyksen hakemuksesta`
              });
              
              // Send email to each financier
              if (financier.email) {
                console.log('📧 [MESSAGE] Sending email to financier:', financier.email);
                await sendNotificationEmail({
                  to: financier.email,
                  subject: 'Uusi viesti asiakkaalta - Juuri Rahoitus',
                  type: 'message',
                  customer_name: companyName,
                  company_name: companyName,
                });
              }
            }
          } else {
            console.warn('⚠️ [MESSAGE] No financiers found in system!');
          }
        }
      } else {
        // Admin/Financier sent message - notify customer
        
        // Create in-app notification if user_id exists
        if (app?.user_id) {
          notificationsToCreate.push({
            user_id: app.user_id,
            title: messageData.is_info_request ? 'Lisätietopyyntö' : 'Uusi viesti',
            message: messageData.is_info_request ? 'Sinulle on lisätietopyyntö hakemukseesi' : 'Sait uuden viestin hakemukseesi'
          });
        }
        
        // ALWAYS send email if contact_email exists (regardless of user_id)
        // Get customer email for notification
        const { data: appWithEmail } = await supabase
          .from('applications')
          .select('contact_email, contact_person, company_name')
          .eq('id', messageData.application_id)
          .single();
        
        if (appWithEmail?.contact_email) {
          console.log('📧 [MESSAGE] Sending email to:', appWithEmail.contact_email);
          const emailResult = await sendNotificationEmail({
            to: appWithEmail.contact_email,
            subject: messageData.is_info_request ? 'Lisätietopyyntö hakemukseesi - Juuri Rahoitus' : 'Uusi viesti - Juuri Rahoitus',
            type: messageData.is_info_request ? 'info_request' : 'message',
            customer_name: appWithEmail.contact_person || undefined,
            company_name: appWithEmail.company_name || undefined,
          });
          if (!emailResult.success) {
            console.error('❌ [MESSAGE] EMAIL FAILED:', emailResult.error);
          } else {
            console.log('✅ [MESSAGE] Email sent successfully');
          }
        } else {
          console.warn('⚠️ [MESSAGE] No contact_email found!');
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
    
    // For customers, filter by user_id or email
    if (role === 'CUSTOMER' && (userId || email)) {
      let query = supabase.from('applications').select('*');
      if (userId && email) {
        query = query.or(`user_id.eq.${userId},contact_email.ilike.${email}`);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else if (email) {
        query = query.ilike('contact_email', email);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      return { data, error };
    }
    
    // For financiers, only show applications where they have made an offer OR new/assigned applications
    if (role === 'FINANCIER' && userId) {
      // First get application IDs where this financier has made offers
      const { data: financierOffers } = await supabase
        .from('offers')
        .select('application_id')
        .eq('financier_id', userId);
      
      const offerAppIds = financierOffers?.map(o => o.application_id) || [];
      
      // Get applications: new (SUBMITTED), assigned to financier (SUBMITTED_TO_FINANCIER), or ones they have offers on
      let query = supabase.from('applications').select('*');
      
      if (offerAppIds.length > 0) {
        // Show SUBMITTED/SUBMITTED_TO_FINANCIER apps OR apps where financier has made an offer
        query = query.or(`status.in.(SUBMITTED,SUBMITTED_TO_FINANCIER),id.in.(${offerAppIds.join(',')})`);
      } else {
        // Only show SUBMITTED or SUBMITTED_TO_FINANCIER apps (new/assigned applications)
        query = query.in('status', ['SUBMITTED', 'SUBMITTED_TO_FINANCIER']);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      return { data, error };
    }
    
    // For admins or no role specified, show all
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });
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
      
      // Create notifications for ADMINS ONLY (not financiers)
      // Financiers get notified only when admin assigns the application to them specifically
      try {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('role', 'ADMIN')
          .eq('is_active', true);
        
        if (admins && admins.length > 0) {
          // Create in-app notifications for admins only
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
  },
  
  updateStatus: async (id: string | number, status: string) => {
    if (!isSupabaseConfigured()) return { data: null, error: null };
    
    const idStr = String(id);
    console.log('Updating application status:', idStr, status);
    
    const { data, error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', idStr)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating application status:', error);
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
