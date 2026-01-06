-- Juuri Rahoitus Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'FINANCIER', 'CUSTOMER')),
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  business_id TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  application_type TEXT NOT NULL CHECK (application_type IN ('LEASING', 'SALE_LEASEBACK')),
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'SUBMITTED_TO_FINANCIER', 'INFO_REQUESTED', 'OFFER_RECEIVED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'CONTRACT_SENT', 'SIGNED', 'CLOSED', 'CANCELLED')),
  company_name TEXT NOT NULL,
  business_id TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  equipment_description TEXT,
  equipment_price DECIMAL(12,2) NOT NULL,
  current_value DECIMAL(12,2),
  requested_term_months INTEGER NOT NULL DEFAULT 36,
  down_payment BOOLEAN DEFAULT false,
  link_to_item TEXT,
  additional_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  financier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_ADMIN', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  monthly_payment DECIMAL(12,2) NOT NULL,
  residual_value DECIMAL(12,2),
  term_months INTEGER NOT NULL,
  interest_rate DECIMAL(5,2),
  notes TEXT,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'SIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  lessor_company_name TEXT NOT NULL,
  lessor_business_id TEXT,
  lessor_address TEXT,
  lessor_contact_person TEXT,
  lessor_email TEXT,
  lessor_phone TEXT,
  lessee_company_name TEXT NOT NULL,
  lessee_business_id TEXT,
  lessee_address TEXT,
  lessee_contact_person TEXT,
  lessee_email TEXT,
  lessee_phone TEXT,
  equipment_description TEXT NOT NULL,
  equipment_price DECIMAL(12,2) NOT NULL,
  monthly_payment DECIMAL(12,2) NOT NULL,
  term_months INTEGER NOT NULL,
  residual_value DECIMAL(12,2),
  start_date DATE,
  end_date DATE,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (for info requests and communication)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN', 'FINANCIER', 'CUSTOMER')),
  message TEXT NOT NULL,
  is_info_request BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR')),
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_offers_application_id ON offers(application_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_contracts_application_id ON contracts(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_application_id ON messages(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Applications policies
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (
  user_id = auth.uid() OR 
  contact_email = (SELECT email FROM profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER'))
);
CREATE POLICY "Users can insert applications" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own applications" ON applications FOR UPDATE USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER'))
);

-- Offers policies
CREATE POLICY "View offers" ON offers FOR SELECT USING (
  EXISTS (SELECT 1 FROM applications WHERE applications.id = offers.application_id AND (
    applications.user_id = auth.uid() OR
    applications.contact_email = (SELECT email FROM profiles WHERE id = auth.uid())
  )) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER'))
);
CREATE POLICY "Financiers can create offers" ON offers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER'))
);
CREATE POLICY "Update offers" ON offers FOR UPDATE USING (
  financier_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER')) OR
  EXISTS (SELECT 1 FROM applications WHERE applications.id = offers.application_id AND applications.user_id = auth.uid())
);

-- Contracts policies
CREATE POLICY "View contracts" ON contracts FOR SELECT USING (
  EXISTS (SELECT 1 FROM applications WHERE applications.id = contracts.application_id AND (
    applications.user_id = auth.uid() OR
    applications.contact_email = (SELECT email FROM profiles WHERE id = auth.uid())
  )) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER'))
);
CREATE POLICY "Create contracts" ON contracts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER'))
);
CREATE POLICY "Update contracts" ON contracts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER'))
);

-- Messages policies
CREATE POLICY "View messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM applications WHERE applications.id = messages.application_id AND (
    applications.user_id = auth.uid() OR
    applications.contact_email = (SELECT email FROM profiles WHERE id = auth.uid())
  )) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCIER'))
);
CREATE POLICY "Send messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Mark messages read" ON messages FOR UPDATE USING (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, last_name, company_name, business_id, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'business_id',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (you'll need to create this user through Supabase Auth first)
-- Then run: UPDATE profiles SET role = 'ADMIN' WHERE email = 'admin@juurirahoitus.fi';


