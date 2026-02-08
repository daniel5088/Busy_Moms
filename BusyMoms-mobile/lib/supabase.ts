import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file and app.config.js');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ---- Shared App Types (from web app) -------------------------------------------
export type UUID = string;

export interface FamilyMember {
  id: UUID;
  user_id: UUID;
  name: string;
  age?: number | null;
  birthday?: string | null;
  birthday_estimated?: boolean | null;
  gender?: 'Boy' | 'Girl' | 'Other' | null;
  relationship?: string | null;
  avatar_url?: string | null;
  allergies?: string[] | null;
  medical_notes?: string | null;
  school?: string | null;
  grade?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: UUID;
  user_id: UUID;
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  travel_time_minutes?: number | null;
  travel_time_updated_at?: string | null;
  participants?: string[] | null;
  event_type?: string | null;
  rsvp_required?: boolean | null;
  rsvp_status?: 'pending' | 'yes' | 'no' | 'maybe' | null;
  source?: 'whatsapp' | 'manual' | 'ai' | null;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: UUID;
  user_id: UUID;
  assigned_to?: UUID | null;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | null;
  due_date?: string | null;
  due_time?: string | null;
  recurring?: boolean | null;
  recurring_pattern?: string | null;
  points?: number | null;
  notes?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: UUID;
  user_id: UUID;
  name: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  category?: string | null;
  rating?: number | null;
  notes?: string | null;
  verified?: boolean | null;
  background_check_date?: string | null;
  background_check_status?: string | null;
  available?: boolean | null;
  last_contact?: string | null;
  google_resource_name?: string | null;
  google_etag?: string | null;
  synced_at?: string | null;
  sync_status?: 'local_only' | 'synced' | 'sync_pending' | 'sync_error' | null;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: UUID;
  email: string;
  full_name?: string | null;
  user_type?: 'Mom' | 'Dad' | 'Guardian' | 'Other' | null;
  onboarding_completed?: boolean | null;
  ai_personality?: 'Friendly' | 'Professional' | 'Humorous' | null;
  dark_mode?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export type ProviderName = 'instacart' | 'amazon' | 'manual' | null;
export type PurchaseStatus = 'not_sent' | 'in_cart' | 'purchased' | 'failed';

export interface ProviderMetadata {
  cart_url?: string;
  timestamp?: string;
  sync_info?: Record<string, any>;
  [key: string]: any;
}

export interface ShoppingItem {
  id: UUID;
  user_id: UUID;
  item: string;
  quantity?: number | null;
  unit?: string | null;
  original_unit?: string | null;
  category?:
    | 'dairy'
    | 'produce'
    | 'meat'
    | 'bakery'
    | 'baby'
    | 'beverages'
    | 'frozen'
    | 'household'
    | 'snacks'
    | 'health'
    | 'pantry'
    | 'other'
    | string
    | null;
  notes?: string | null;
  completed?: boolean | null;
  assigned_to?: UUID | null;
  recipe_id?: UUID | null;
  provider_name?: ProviderName;
  purchase_status?: PurchaseStatus;
  external_order_id?: string | null;
  provider_metadata?: ProviderMetadata | null;
  provider_synced_at?: string | null;
  urgent?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: UUID;
  user_id: UUID;
  title: string;
  author?: string | null;
  description?: string | null;
  image_url?: string | null;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cooking_time_minutes?: number | null;
  instructions?: string[] | null;
  source_url?: string | null;
  instacart_recipe_url?: string | null;
  url_expires_at?: string | null;
  instacart_metadata?: Record<string, any> | null;
  external_id?: string | null;
  external_source?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeIngredient {
  id: UUID;
  recipe_id: UUID;
  name: string;
  display_text: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  display_order?: number | null;
  brand_filters?: string[] | null;
  health_filters?: string[] | null;
  is_pantry_item?: boolean | null;
  created_at?: string;
}

export interface Affirmation {
  id: UUID;
  user_id: UUID;
  affirmation_text: string;
  generated_date: string;
  data_sources?: {
    calendar?: boolean;
    tasks?: boolean;
    family?: boolean;
    shopping?: boolean;
    ai_generated?: boolean;
    fallback?: boolean;
  } | null;
  viewed?: boolean | null;
  favorited?: boolean | null;
  created_at?: string;
  updated_at?: string;
}
