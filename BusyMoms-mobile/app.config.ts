import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_PRODUCTION = process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';
const IS_STAGING = process.env.EXPO_PUBLIC_ENVIRONMENT === 'staging';
const IS_DEV = !IS_PRODUCTION && !IS_STAGING;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_PRODUCTION ? 'Busy Moms' : IS_STAGING ? 'Busy Moms (Staging)' : 'Busy Moms (Dev)',
  slug: 'busy-moms-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'busymoms',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#3B82F6',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_PRODUCTION
      ? 'com.busymoms.mobile'
      : IS_STAGING
      ? 'com.busymoms.mobile.staging'
      : 'com.busymoms.mobile.dev',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: 'Busy Moms needs access to your camera to capture life receipts and images.',
      NSMicrophoneUsageDescription: 'Busy Moms needs access to your microphone for voice chat and voice notes.',
      NSLocationWhenInUseUsageDescription: 'Busy Moms needs your location to show nearby stores and calculate travel times.',
      NSPhotoLibraryUsageDescription: 'Busy Moms needs access to your photo library to save and share images.',
      NSCalendarsUsageDescription: 'Busy Moms needs access to your calendar to sync events.',
      NSContactsUsageDescription: 'Busy Moms needs access to your contacts to sync family and friends.',
      NSRemindersUsageDescription: 'Busy Moms needs access to your reminders to sync tasks.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#3B82F6',
    },
    package: IS_PRODUCTION
      ? 'com.busymoms.mobile'
      : IS_STAGING
      ? 'com.busymoms.mobile.staging'
      : 'com.busymoms.mobile.dev',
    versionCode: 1,
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'NOTIFICATIONS',
      'READ_CALENDAR',
      'WRITE_CALENDAR',
      'READ_CONTACTS',
      'WRITE_CONTACTS',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        color: '#3B82F6',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow Busy Moms to use your location to show nearby stores and calculate travel times.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Busy Moms to access your camera to capture life receipts and images.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Busy Moms to access your photos to select images.',
      },
    ],
    'expo-av',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
    enableDevTools: IS_DEV,
    enableVoiceChat: !IS_DEV || process.env.EXPO_PUBLIC_ENABLE_VOICE_CHAT === 'true',
    logLevel: IS_PRODUCTION ? 'error' : IS_STAGING ? 'warn' : 'debug',
    eas: {
      projectId: 'your-project-id-here', // To be updated when setting up EAS
    },
  },
  updates: {
    url: 'https://u.expo.dev/your-project-id-here',
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
});
