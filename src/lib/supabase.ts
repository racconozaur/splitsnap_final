import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client only if credentials are provided
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder');
};

// Database types matching our Supabase schema
export interface DbSession {
  id: string;
  restaurant_name: string;
  payer_name: string;
  payer_payment_info: {
    twintPhone?: string;
    revolutTag?: string;
    iban?: string;
    preferredMethod: 'twint' | 'revolut' | 'iban' | 'cash';
  };
  subtotal: number;
  tax: number;
  tip: number;
  service_fee: number;
  total: number;
  number_of_people: number;
  is_locked: boolean;
  created_at: string;
}

export interface DbItem {
  id: string;
  session_id: string;
  name: string;
  price: number;
  quantity: number;
  is_shared: boolean;
  confidence: number | null;
  created_at: string;
}

export interface DbParticipant {
  id: string;
  session_id: string;
  name: string;
  amount_owed: number;
  payment_status: 'unpaid' | 'pending' | 'paid' | 'confirmed';
  created_at: string;
}

export interface DbSelection {
  id: string;
  participant_id: string;
  item_id: string;
  share: number;
  amount: number;
}
