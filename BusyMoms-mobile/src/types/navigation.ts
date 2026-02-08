/**
 * Navigation type definitions for Expo Router
 * Defines route parameters for type-safe navigation
 */

import { UUID } from './database';

// Root stack params
export type RootStackParamList = {
  index: undefined;
  '(auth)/login': undefined;
  '(auth)/signup': undefined;
  '(auth)/forgot-password': undefined;
  '(onboarding)/profile': undefined;
  '(onboarding)/family': undefined;
  '(onboarding)/preferences': undefined;
  '(onboarding)/complete': undefined;
  '(tabs)/dashboard': undefined;
  '(tabs)/calendar': undefined;
  '(tabs)/shopping': undefined;
  '(tabs)/family': undefined;
  '(tabs)/more': undefined;
  'event/[id]': { id: UUID };
  'event/create': undefined;
  'task/[id]': { id: UUID };
  'task/create': undefined;
  'contact/[id]': { id: UUID };
  'contact/create': undefined;
  'recipe/[id]': { id: UUID };
  'family-member/[id]': { id: UUID };
  'life-receipts/index': undefined;
  'life-receipts/capture': undefined;
  'life-receipts/triage': undefined;
  'life-receipts/view': { id?: UUID };
  'settings/index': undefined;
  'settings/notifications': undefined;
  'settings/sync': undefined;
  'settings/addresses': undefined;
  'settings/weather': undefined;
  'settings/measurement': undefined;
  'settings/voice-preferences': undefined;
  'settings/about': undefined;
  'voice-chat': undefined;
  'cycle-tracker': undefined;
  'gift-finder': undefined;
  'quick-links': undefined;
};

// Tab navigation params
export type TabParamList = {
  dashboard: undefined;
  calendar: undefined;
  shopping: undefined;
  family: undefined;
  more: undefined;
};

// Auth navigation params
export type AuthParamList = {
  login: undefined;
  signup: undefined;
  'forgot-password': undefined;
};

// Onboarding navigation params
export type OnboardingParamList = {
  profile: undefined;
  family: undefined;
  preferences: undefined;
  complete: undefined;
};
