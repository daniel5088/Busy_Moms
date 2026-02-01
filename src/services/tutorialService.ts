import { supabase } from '../lib/supabase';

export type TutorialName = 'dashboard' | 'calendar' | 'family_hub' | 'sarah';

export interface TutorialProgress {
  id: string;
  user_id: string;
  tutorial_name: TutorialName;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTutorialProgress(tutorialName: TutorialName): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return true;
  }

  const { data, error } = await supabase
    .from('user_tutorials')
    .select('completed')
    .eq('user_id', user.id)
    .eq('tutorial_name', tutorialName)
    .maybeSingle();

  if (error) {
    console.error('Error fetching tutorial progress:', error);
    return false;
  }

  return data?.completed ?? false;
}

export async function markTutorialComplete(tutorialName: TutorialName): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from('user_tutorials')
    .upsert({
      user_id: user.id,
      tutorial_name: tutorialName,
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,tutorial_name'
    });

  if (error) {
    console.error('Error marking tutorial as complete:', error);
  }
}

export async function resetTutorial(tutorialName: TutorialName): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from('user_tutorials')
    .upsert({
      user_id: user.id,
      tutorial_name: tutorialName,
      completed: false,
      completed_at: null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,tutorial_name'
    });

  if (error) {
    console.error('Error resetting tutorial:', error);
  }
}

export async function getAllTutorialProgress(): Promise<Record<TutorialName, boolean>> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      dashboard: false,
      calendar: false,
      family_hub: false,
      sarah: false,
    };
  }

  const { data, error } = await supabase
    .from('user_tutorials')
    .select('tutorial_name, completed')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching all tutorial progress:', error);
    return {
      dashboard: false,
      calendar: false,
      family_hub: false,
    };
  }

  const progress: Record<TutorialName, boolean> = {
    dashboard: false,
    calendar: false,
    family_hub: false,
    sarah: false,
  };

  data?.forEach((item) => {
    progress[item.tutorial_name as TutorialName] = item.completed;
  });

  return progress;
}

export async function resetAllTutorialsAndRestart(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const tutorials: TutorialName[] = ['dashboard', 'calendar', 'family_hub', 'sarah'];

  for (const tutorial of tutorials) {
    await resetTutorial(tutorial);
  }
}
