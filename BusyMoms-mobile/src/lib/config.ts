import Constants from 'expo-constants';

interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleWebClientId: string;
  googleIosClientId: string;
  environment: 'development' | 'staging' | 'production';
}

function getConfig(): Config {
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = Constants.expoConfig?.extra?.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const environment = (Constants.expoConfig?.extra?.environment || process.env.EXPO_PUBLIC_ENVIRONMENT || 'development') as Config['environment'];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    googleWebClientId: googleWebClientId || '',
    googleIosClientId: googleIosClientId || '',
    environment,
  };
}

export const config = getConfig();

export const featureFlags = {
  enableVoiceChat: config.environment !== 'production',
  enableLifeReceipts: true,
  enableCycleTracker: true,
  enableOfflineMode: config.environment === 'production',
};
