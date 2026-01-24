import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/cycle-tracker`;

export interface CycleData {
  id?: string;
  user_id?: string;
  period_start_date: string;
  cycle_length: number;
  period_length: number;
  created_at?: string;
  updated_at?: string;
}

export interface CycleSymptom {
  id?: string;
  user_id?: string;
  symptom_date: string;
  symptoms: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CycleHistory {
  id?: string;
  user_id?: string;
  period_start_date: string;
  cycle_length: number;
  period_length: number;
  created_at?: string;
}

export interface CycleInsightsRequest {
  currentPhase: 'period' | 'follicular' | 'ovulation' | 'luteal';
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  symptoms?: Array<{ date: string; symptoms: string[] }>;
  cycleHistory?: CycleHistory[];
}

export const cycleTrackerService = {
  async getCycleData(): Promise<CycleData | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('cycle_data')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveCycleData(cycleData: Partial<CycleData>): Promise<CycleData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const existingData = await this.getCycleData();

    if (existingData) {
      const { data, error } = await supabase
        .from('cycle_data')
        .update({
          period_start_date: cycleData.period_start_date,
          cycle_length: cycleData.cycle_length,
          period_length: cycleData.period_length,
        })
        .eq('id', existingData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('cycle_data')
        .insert({
          user_id: user.id,
          period_start_date: cycleData.period_start_date,
          cycle_length: cycleData.cycle_length,
          period_length: cycleData.period_length,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async getSymptoms(): Promise<CycleSymptom[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('cycle_symptoms')
      .select('*')
      .eq('user_id', user.id)
      .order('symptom_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async saveSymptom(symptom: Partial<CycleSymptom>): Promise<CycleSymptom> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const existingSymptom = await supabase
      .from('cycle_symptoms')
      .select('*')
      .eq('user_id', user.id)
      .eq('symptom_date', symptom.symptom_date)
      .maybeSingle();

    if (existingSymptom.data) {
      const { data, error } = await supabase
        .from('cycle_symptoms')
        .update({
          symptoms: symptom.symptoms,
          notes: symptom.notes,
        })
        .eq('id', existingSymptom.data.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('cycle_symptoms')
        .insert({
          user_id: user.id,
          symptom_date: symptom.symptom_date,
          symptoms: symptom.symptoms,
          notes: symptom.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async getCycleHistory(): Promise<CycleHistory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('cycle_history')
      .select('*')
      .eq('user_id', user.id)
      .order('period_start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addCycleHistory(history: Partial<CycleHistory>): Promise<CycleHistory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('cycle_history')
      .insert({
        user_id: user.id,
        period_start_date: history.period_start_date,
        cycle_length: history.cycle_length,
        period_length: history.period_length,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async callEdgeFunction(action: string, cycleData: CycleInsightsRequest): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'x-correlation-id': crypto.randomUUID(),
        },
        body: JSON.stringify({
          action,
          user_id: user.id,
          cycle_data: cycleData,
        }),
      });

      if (!response.ok) {
        let errorMessage = `API Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `${errorMessage} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('The Wellness edge function is not deployed. Please deploy it via Supabase Dashboard: Edge Functions > Deploy cycle-tracker');
      }
      throw error;
    }
  },
};
