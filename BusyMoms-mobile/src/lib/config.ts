import Constants from 'expo-constants';

export type Environment = 'development' | 'staging' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleWebClientId: string;
  googleIosClientId: string;
  googleAndroidClientId: string;
  environment: Environment;
  enableDevTools: boolean;
  logLevel: LogLevel;
}

function getConfig(): Config {
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = Constants.expoConfig?.extra?.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const environment = (Constants.expoConfig?.extra?.environment || process.env.EXPO_PUBLIC_ENVIRONMENT || 'development') as Environment;
  const enableDevTools = Constants.expoConfig?.extra?.enableDevTools ?? (environment === 'development');
  const logLevel = (Constants.expoConfig?.extra?.logLevel || 'debug') as LogLevel;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    googleWebClientId: googleWebClientId || '',
    googleIosClientId: googleIosClientId || '',
    googleAndroidClientId: googleAndroidClientId || '',
    environment,
    enableDevTools,
    logLevel,
  };
}

export const config = getConfig();

export const featureFlags = {
  // Voice chat enabled in dev/staging, controlled flag in production
  enableVoiceChat: Constants.expoConfig?.extra?.enableVoiceChat ?? (config.environment !== 'production'),

  // Core features enabled in all environments
  enableLifeReceipts: true,
  enableCycleTracker: true,
  enableGiftFinder: true,
  enableQuickLinks: true,
  enableTutorials: true,

  // Sync features (dependent on Google OAuth setup)
  enableGoogleCalendarSync: true,
  enableGoogleTasksSync: true,
  enableGoogleContactsSync: true,

  // Offline mode enabled in all environments
  enableOfflineMode: true,

  // Performance features
  enableQueryPersistence: config.environment === 'production',
  enableBackgroundSync: config.environment === 'production',

  // Analytics & monitoring (production only)
  enableAnalytics: config.environment === 'production',
  enableCrashReporting: config.environment === 'production',

  // Debug features (non-production only)
  enableDebugMode: config.enableDevTools,
  enableReactQueryDevtools: config.environment === 'development',
};

// Environment-specific settings
export const settings = {
  // Cache duration (longer in production)
  cacheTime: config.environment === 'production' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000, // 24h vs 1h

  // Stale time (data considered fresh)
  staleTime: config.environment === 'production' ? 5 * 60 * 1000 : 1 * 60 * 1000, // 5min vs 1min

  // Network retry attempts
  maxRetries: config.environment === 'production' ? 3 : 1,

  // API timeout
  apiTimeout: config.environment === 'production' ? 30000 : 10000, // 30s vs 10s

  // Offline queue max size
  offlineQueueMaxSize: 100,

  // Max cache size (10MB)
  maxCacheSize: 10 * 1024 * 1024,
};
