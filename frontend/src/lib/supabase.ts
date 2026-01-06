import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Using demo mode.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Database types
export interface DbUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'FINANCIER' | 'CUSTOMER';
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  business_id: string | null;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbApplication {
  id: string;
  user_id: string;
  application_type: 'LEASING' | 'SALE_LEASEBACK';
  status: 'DRAFT' | 'SUBMITTED' | 'SUBMITTED_TO_FINANCIER' | 'INFO_REQUESTED' | 'OFFER_RECEIVED' | 'OFFER_SENT' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'CONTRACT_SENT' | 'SIGNED' | 'CLOSED' | 'CANCELLED';
  company_name: string;
  business_id: string;
  contact_person: string | null;
  contact_email: string;
  contact_phone: string | null;
  equipment_description: string | null;
  equipment_price: number;
  current_value: number | null;
  requested_term_months: number;
  down_payment: boolean;
  link_to_item: string | null;
  additional_info: string | null;
  ytj_data: string | null; // JSON string of YTJCompanyDetails
  created_at: string;
  updated_at: string;
}

export interface DbOffer {
  id: string;
  application_id: string;
  financier_id: string | null;
  status: 'DRAFT' | 'PENDING_ADMIN' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  monthly_payment: number;
  upfront_payment: number | null;
  residual_value: number | null;
  term_months: number;
  interest_rate: number | null;
  opening_fee: number | null;
  invoice_fee: number | null;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbContract {
  id: string;
  application_id: string;
  offer_id: string;
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  lessor_company_name: string;
  lessor_business_id: string | null;
  lessor_address: string | null;
  lessor_contact_person: string | null;
  lessor_email: string | null;
  lessor_phone: string | null;
  lessee_company_name: string;
  lessee_business_id: string | null;
  lessee_address: string | null;
  lessee_contact_person: string | null;
  lessee_email: string | null;
  lessee_phone: string | null;
  equipment_description: string;
  equipment_price: number;
  monthly_payment: number;
  term_months: number;
  residual_value: number | null;
  start_date: string | null;
  end_date: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  application_id: string;
  sender_id: string;
  sender_role: 'ADMIN' | 'FINANCIER' | 'CUSTOMER';
  message: string;
  is_info_request: boolean;
  is_read: boolean;
  status?: 'PENDING' | 'RESPONDED' | 'CLOSED';  // For info requests
  documents?: Array<{ type: string; label: string; required: boolean }>;  // Requested documents
  reply_to_id?: string;  // Reference to original info request message
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

