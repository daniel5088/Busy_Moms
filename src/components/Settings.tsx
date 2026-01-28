import React, { useState } from 'react';
import {
  User,
  Bell,
  Smartphone,
  MessageCircle,
  CreditCard,
  HelpCircle,
  LogOut,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  CreditCard as Edit,
  Volume2,
  Calendar,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Store,
  MapPin,
  Ruler,
  Moon,
  LayoutDashboard,
} from 'lucide-react';
import { FamilyMemberForm } from './forms/FamilyMemberForm';
import { ProfileForm } from './forms/ProfileForm';
import { ConnectionTest } from './ConnectionTest';
import { AuthTest } from './AuthTest';
import { GoogleCalendarTest } from './GoogleCalendarTest';
import { ErrorDashboard } from './errors/ErrorDashboard';
import { NotificationSettings } from './NotificationSettings';
//Alvaros - Dailyaffirmations: Remove AffirmationSettings import (now managed at App level)
import { ConnectGoogleCalendarButton } from './ConnectGoogleCalendarButton';
import { SyncSettings } from './SyncSettings';
import { TaskSyncSettings } from './TaskSyncSettings';
import { RetailerSearch } from './RetailerSearch';
import { AddressManager } from './AddressManager';
import { FamilyMember, Profile, supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { googleCalendarService } from '../services/googleCalendar';
import { useCalendarSync } from '../hooks/useCalendarSync';
import { measurementPreferencesService } from '../services/measurementPreferencesService';
import type { UserMeasurementPreferences } from '../lib/supabase';
import {
  aiVoicePreferencesService,
  AIVoicePreferences,
  AIVoice,
  AIPersonality,
  VOICE_OPTIONS,
  PERSONALITY_OPTIONS
} from '../services/aiVoicePreferences';
import { getAgeFromBirthday } from '../utils/ageCalculator';

interface SettingsProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  scrollToGoogleCalendar?: boolean;
}

export function Settings({
  darkMode,
  toggleDarkMode,
  scrollToGoogleCalendar = false,
}: SettingsProps) {
  const { user, signOut } = useAuth();
  const { performSync } = useCalendarSync();
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  //Alvaros - Dailyaffirmations: Removed showAffirmationSettings state (now managed at App level)
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showTaskSyncSettings, setShowTaskSyncSettings] = useState(false);
  const [showRetailerSearch, setShowRetailerSearch] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [showAuthTest, setShowAuthTest] = useState(false);
  const [showGoogleCalendarTest, setShowGoogleCalendarTest] = useState(false);
  const [showErrorDashboard, setShowErrorDashboard] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [measurementPrefs, setMeasurementPrefs] = useState<UserMeasurementPreferences | null>(null);
  const [aiVoicePrefs, setAiVoicePrefs] = useState<AIVoicePreferences | null>(null);
  const [notifications, setNotifications] = useState({
    events: true,
    shopping: true,
    reminders: true,
  });

  const checkGoogleConnection = React.useCallback(async () => {
    if (!user) return;

    try {
      const connected = await googleCalendarService.isConnected();
      setIsGoogleConnected(connected);
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      setIsGoogleConnected(false);
    }
  }, [user]);

  const loadCurrentProfile = React.useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not load profile:', error.message);
      } else if (profile) {
        setCurrentProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [user]);

  const updatePersonality = async (personality: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_personality: personality })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating personality:', error);
        return;
      }

      setCurrentProfile(prev => prev ? { ...prev, ai_personality: personality } : null);
    } catch (error) {
      console.error('Error updating personality:', error);
    }
  };

  const loadFamilyMembers = React.useCallback(async () => {
    if (!user) {
      setFamilyMembers([]);
      setLoadingMembers(false);
      return;
    }

    setLoadingMembers(true);
    try {
      const { data: members, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not load family members from database:', error.message);
        setFamilyMembers([]);
      } else {
        setFamilyMembers(members || []);
      }
    } catch (error) {
      console.error('Error loading family members:', error);
      setFamilyMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [user]);

  const loadMeasurementPreferences = React.useCallback(async () => {
    if (!user) return;

    try {
      const prefs = await measurementPreferencesService.getPreferences(user.id);
      setMeasurementPrefs(prefs);
    } catch (error) {
      console.error('Error loading measurement preferences:', error);
    }
  }, [user]);

  const toggleMeasurementSystem = async () => {
    if (!user || !measurementPrefs) return;

    try {
      const newSystem = measurementPrefs.preferred_system === 'metric' ? 'imperial' : 'metric';
      await measurementPreferencesService.setPreferredSystem(user.id, newSystem);
      await loadMeasurementPreferences();
    } catch (error) {
      console.error('Error toggling measurement system:', error);
    }
  };


  const loadAIVoicePreferences = React.useCallback(async () => {
    if (!user) return;

    try {
      const prefs = await aiVoicePreferencesService.getOrCreatePreferences(user.id);
      setAiVoicePrefs(prefs);
    } catch (error) {
      console.error('Error loading AI voice preferences:', error);
    }
  }, [user]);

  const updateVoice = async (voice: AIVoice) => {
    if (!user) return;

    try {
      const updated = await aiVoicePreferencesService.updatePreferences(user.id, { voice });
      if (updated) {
        setAiVoicePrefs(updated);
      }
    } catch (error) {
      console.error('Error updating voice:', error);
    }
  };

  const updatePersonalityPreference = async (personality: AIPersonality) => {
    if (!user) return;

    try {
      const updated = await aiVoicePreferencesService.updatePreferences(user.id, { personality });
      if (updated) {
        setAiVoicePrefs(updated);
      }
    } catch (error) {
      console.error('Error updating personality:', error);
    }
  };

  // Load data on component mount and when user changes
  React.useEffect(() => {
    let mounted = true;

    const loadAllData = async () => {
      if (!user || !mounted) return;

      await Promise.all([
        loadFamilyMembers(),
        loadCurrentProfile(),
        checkGoogleConnection(),
        loadMeasurementPreferences(),
        loadAIVoicePreferences(),
      ]);
    };

    loadAllData();

    return () => {
      mounted = false;
    };
  }, [
    user,
    loadFamilyMembers,
    loadCurrentProfile,
    checkGoogleConnection,
    loadMeasurementPreferences,
    loadAIVoicePreferences,
  ]);

  // Scroll to Google Calendar section if requested
  React.useEffect(() => {
    if (scrollToGoogleCalendar) {
      setTimeout(() => {
        handleGoogleCalendarConnect();
      }, 500);
    }
  }, [scrollToGoogleCalendar]);

  // Listen for auth state changes to detect when Google Calendar is connected
  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.provider_token) {
          await checkGoogleConnection();
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [checkGoogleConnection]);

  const syncWithGoogleCalendar = async () => {
    if (syncingGoogle) return;

    setSyncingGoogle(true);
    try {
      await performSync();
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      alert('Failed to sync with Google Calendar. Please try again.');
    } finally {
      setSyncingGoogle(false);
    }
  };

  const deleteFamilyMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this family member?')) {
      return;
    }

    try {
      const { error } = await supabase.from('family_members').delete().eq('id', memberId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setFamilyMembers((prev) => prev.filter((member) => member.id !== memberId));
    } catch (error) {
      console.error('Error deleting family member:', error);
      alert('Error deleting family member. Please try again.');
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFamilyMemberCreated = (newMember: FamilyMember) => {
    setFamilyMembers((prev) => [...prev, newMember]);
  };

  const handleProfileUpdated = (updatedProfile: Profile) => {
    setCurrentProfile(updatedProfile);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGoogleCalendarConnect = () => {
    const googleCalendarSection = document.querySelector('[data-google-calendar-section]');
    if (googleCalendarSection) {
      googleCalendarSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const settingSections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: Moon,
          title: 'Dark Mode',
          description: 'Switch between light and dark themes',
          toggle: true,
          enabled: darkMode,
          onClick: toggleDarkMode,
        },
      ],
    },
    {
      title: 'Family Profile',
      items: [
        {
          icon: User,
          title: 'Family Members',
          description: 'Manage your family members',
          action: 'Add',
          showAddButton: false,
        },
        // TEMP: removed (no implementation). Re-enable by uncommenting.
        // {
        //   icon: Shield,
        //   title: 'Privacy & Safety',
        //   description: 'Allergies, medical info, emergency contacts',
        //   action: 'Manage',
        // },
      ],
    },
    {
      title: 'System',
      items: [
        {
          icon: AlertTriangle,
          title: 'Error Dashboard',
          description: 'Monitor and resolve application errors',
          action: 'View',
          onClick: () => setShowErrorDashboard(true),
        },
        {
          icon: Database,
          title: 'Test Supabase Connection',
          description: 'Verify database connectivity',
          action: 'Test',
          onClick: () => setShowConnectionTest(true),
        },
        {
          icon: User,
          title: 'Test Authentication',
          description: 'Setup and test demo user login',
          action: 'Test',
          onClick: () => setShowAuthTest(true),
        },
        {
          icon: Calendar,
          title: 'Test Google Calendar',
          description: 'Verify Google Calendar API integration',
          action: 'Test',
          onClick: () => setShowGoogleCalendarTest(true),
        },
      ],
    },
    {
      title: 'Location Services',
      items: [
        {
          icon: MapPin,
          title: 'Saved Addresses',
          description: 'Manage your home, work, and other locations',
          action: 'Manage',
          onClick: () => setShowAddressManager(true),
        },
      ],
    },
    {
      title: 'Measurement Preferences',
      items: [
        {
          icon: Ruler,
          title: 'Measurement System',
          description: measurementPrefs
            ? `Using ${measurementPrefs.preferred_system === 'metric' ? 'Metric (grams, mililiters, kilograms)' : 'Imperial (cups, pounds, ounces)'}`
            : 'Loading...',
          toggle: true,
          enabled: measurementPrefs?.preferred_system === 'metric',
          onClick: toggleMeasurementSystem,
        },
      ],
    },
    {
      title: 'Integrations',
      items: [
        {
          icon: Store,
          title: 'Instacart Retailers',
          description: 'Search and manage your preferred retailers',
          action: 'Manage',
          onClick: () => setShowRetailerSearch(true),
        },
        // TEMP: WhatsApp feature exists but is not exposed yet. Showing "Coming Soon" until wired up.
        //{
        //  icon: MessageCircle,
        //  title: 'WhatsApp Integration',
        //  description: 'Parse messages and images for events',
        //  action: 'Coming Soon',
        // },
        // TEMP: removed (no implementation). Re-enable by uncommenting.
        // {
        //   icon: Smartphone,
        //   title: 'Smartwatch',
        //   description: 'Apple Watch connected',
        //   action: 'Paired',
        // },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          title: 'Notification Settings',
          description: 'Manage all notification preferences',
          action: 'Configure',
          onClick: () => setShowNotificationSettings(true),
        },
        {
          icon: Sparkles,
          title: 'Daily Affirmations',
          description: 'Personalized encouragement every day',
          action: 'Configure',
          //Alvaros - Dailyaffirmations: Dispatch event to open unified settings modal at App level
          onClick: () => window.dispatchEvent(new CustomEvent('open-affirmations')),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        //{
        //  icon: CreditCard,
        //  title: 'Subscription',
        //  description: 'Premium Plan - $?/month',
        //  action: 'Coming Soon',
        //},
        {
          icon: HelpCircle,
          title: 'Help & Support',
          description: 'FAQs, contact support',
          action: 'View',
          onClick: () => window.dispatchEvent(new CustomEvent('open-about-dialog')),
        },
      ],
    },
  ];

  // Alvaro - Developer-only System section visibility
  // Only users with @bmaapp.com emails can see System tools
  const isDeveloper = user?.email?.endsWith('@bmaapp.com') ?? false;

  // Alvaro - Filter out System section for non-developers
  const visibleSections = settingSections.filter((section) => {
    if (section.title === 'System' && !isDeveloper) {
      return false;
    }
    return true;
  });

  return (
    <div className="h-screen overflow-y-auto pb-20 sm:pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 text-white p-4 sm:p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">
              {currentProfile?.full_name ||
                user?.user_metadata?.full_name ||
                user?.user_metadata?.name ||
                user?.email?.split('@')[0] ||
                'User'}
            </h1>
            <p className="text-sm sm:text-base text-rose-100">{user?.email}</p>
          </div>
          <button
            onClick={() => setShowProfileForm(true)}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-30 transition-colors"
            title="Edit Profile"
            aria-label="Edit profile"
          >
            <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="bg-white bg-opacity-10 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Premium Plan</h3>
              <p className="text-xs sm:text-sm text-rose-100">All features unlocked</p>
            </div>
            <div className="px-2 sm:px-3 py-1 bg-white bg-opacity-20 rounded-full">
              <span className="text-xs sm:text-sm font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
        {/* AI Assistant Settings */}
        <div className="mb-4 sm:mb-6 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 border border-rose-200 dark:border-gray-600 rounded-xl p-3 sm:p-4">
          {/* Personality Selector */}
          <div className="mb-4">
            <h3 id="personality-heading" className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Assistant Personality</span>
            </h3>
            <div className="grid grid-cols-3 gap-1 sm:gap-2" role="group" aria-labelledby="personality-heading">
              {PERSONALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    option.value === (aiVoicePrefs?.personality || 'friendly')
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-rose-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => updatePersonalityPreference(option.value)}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selector */}
          <div>
            <h3 id="voice-heading" className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <span>AI Voice</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-labelledby="voice-heading">
              {VOICE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`p-2 sm:p-3 rounded-lg text-left transition-all ${
                    option.value === (aiVoicePrefs?.voice || 'shimmer')
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-rose-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => updateVoice(option.value)}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Volume2 className="w-3 h-3" />
                    <span className="font-medium text-xs sm:text-sm">{option.label}</span>
                  </div>
                  <p className={`text-xs ${
                    option.value === (aiVoicePrefs?.voice || 'shimmer')
                      ? 'text-rose-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {visibleSections.map((section, sectionIndex) => (
            <div key={sectionIndex} id={section.title === 'Notifications' ? 'notifications-settings' : undefined}>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center">
                          <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-300" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {item.toggle ? (
                        <button
                          role="switch"
                          aria-checked={item.enabled}
                          aria-label={item.title}
                          onClick={() => {
                            if (item.onClick) {
                              item.onClick();
                            } else if (item.title.includes('Event')) {
                              toggleNotification('events');
                            } else {
                              toggleNotification('shopping');
                            }
                          }}
                          className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full relative transition-all ${
                            item.enabled ? 'bg-rose-500' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${
                              item.enabled ? 'right-0.5' : 'left-0.5'
                            }`}
                          ></div>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (item.title === 'Family Members') {
                              setShowFamilyForm(true);
                            } else if (item.onClick) {
                              item.onClick();
                            }
                          }}
                          className="px-2 sm:px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {item.action}
                        </button>
                      )}

                      {item.showAddButton && (
                        <button
                          onClick={() => setShowFamilyForm(true)}
                          className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors ml-2"
                          aria-label="Add family member"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {section.title === 'Measurement Preferences' && (
                <div className="mt-3 bg-blue-50 dark:bg-blue-900 bg-opacity-50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Automatic unit conversion is always enabled. Measurements convert to your preferred system (Metric or Imperial) automatically.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Google Calendar Detailed Section */}
        <div className="mt-6" data-google-calendar-section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Google Calendar Sync
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Google Calendar
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isGoogleConnected ? 'Connected and syncing' : 'Connect to sync your events'}
                  </p>
                </div>
              </div>
              {isGoogleConnected && (
                <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Connected</span>
                </div>
              )}
            </div>

            {isGoogleConnected ? (
              <div className="space-y-3">
                <button
                  onClick={syncWithGoogleCalendar}
                  disabled={syncingGoogle}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingGoogle ? 'animate-spin' : ''}`} />
                  <span>{syncingGoogle ? 'Syncing...' : 'Sync with Google Calendar'}</span>
                </button>

                <button
                  onClick={() => setShowSyncSettings(true)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Sync Settings
                </button>

                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to disconnect Google Calendar?')) {
                      try {
                        const success = await googleCalendarService.disconnect();
                        if (success) {
                          setIsGoogleConnected(false);
                        } else {
                          alert('Failed to disconnect Google Calendar. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error disconnecting Google Calendar:', error);
                        alert('Failed to disconnect Google Calendar. Please try again.');
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-colors text-sm font-medium"
                >
                  Disconnect Google Calendar
                </button>
              </div>
            ) : (
              <ConnectGoogleCalendarButton
                onConnected={() => {
                  setIsGoogleConnected(true);
                }}
              />
            )}
          </div>
        </div>

        {/* Google Tasks Sync Section */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Google Tasks Sync
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Google Tasks
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isGoogleConnected ? 'Sync your tasks with Google Tasks' : 'Connect Google Calendar to enable task sync'}
                  </p>
                </div>
              </div>
              {isGoogleConnected && (
                <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Available</span>
                </div>
              )}
            </div>

            {isGoogleConnected ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowTaskSyncSettings(true)}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                >
                  Task Sync Settings
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure how your tasks sync with Google Tasks. Tasks will appear in Google Calendar.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect Google Calendar to enable task sync
              </p>
            )}
          </div>
        </div>

        {/* Family Members List */}
        <div className="mt-4 sm:mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Family Members
            </h2>
            <button
              onClick={() => setShowFamilyForm(true)}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors"
              aria-label="Add family member"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-rose-500" />
              <span className="ml-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Loading family members...
              </span>
            </div>
          ) : familyMembers.length > 0 ? (
            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm sm:text-lg">
                          {member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 sm:space-x-3 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                            {member.name}
                          </h3>
                          {member.relationship && (
                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm font-medium">
                              {member.relationship}
                            </span>
                          )}
                          {(() => {
                            const computedAge = member.birthday
                              ? getAgeFromBirthday(member.birthday)
                              : null;
                            const displayAge = computedAge ?? member.age;

                            return displayAge !== null && displayAge !== undefined ? (
                              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-rose-100 text-rose-700 rounded-full text-xs sm:text-sm font-medium">
                                Age {displayAge}
                              </span>
                            ) : null;
                          })()}
                          {member.gender && (
                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm">
                              {member.gender}
                            </span>
                          )}
                        </div>

                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {member.school && (
                            <p>
                              <span className="font-medium">School:</span> {member.school}
                              {member.grade && ` (${member.grade})`}
                            </p>
                          )}
                          {member.allergies && member.allergies.length > 0 && (
                            <p className="text-red-600 dark:text-red-400">
                              <span className="font-medium">Allergies:</span>{' '}
                              {member.allergies.join(', ')}
                            </p>
                          )}
                          {member.medical_notes && (
                            <p className="text-blue-600 dark:text-blue-400">
                              <span className="font-medium">Medical:</span> {member.medical_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-1 sm:space-x-2 flex-col sm:flex-row">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setShowFamilyForm(true);
                        }}
                        className="flex items-center space-x-1 px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg text-xs sm:text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        <Edit className="w-2 h-2 sm:w-3 sm:h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => deleteFamilyMember(member.id)}
                        className="px-2 sm:px-3 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg text-xs sm:text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No family members yet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                Add your children and family members to get started
              </p>
              <button
                onClick={() => setShowFamilyForm(true)}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors text-sm sm:text-base"
              >
                Add First Family Member
              </button>
            </div>
          )}
        </div>

        {/* TEMP: removed (background check history not used). Re-enable by uncommenting. */}
        {/* <div className="mt-4 sm:mt-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
            Background Check History
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                  Maria Rodriguez
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Completed March 10, 2025
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  ✓ Passed
                </div>
              </div>
            </div>
            <button className="text-rose-600 dark:text-rose-400 text-xs sm:text-sm hover:underline">
              View Full Report
            </button>
          </div>
        </div> */}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full mt-6 sm:mt-8 py-2 sm:py-3 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-800 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
        >
          <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <FamilyMemberForm
        isOpen={showFamilyForm}
        onClose={() => {
          setShowFamilyForm(false);
          setEditingMember(null);
        }}
        editMember={editingMember}
        onMemberCreated={(newMember) => {
          handleFamilyMemberCreated(newMember);
          loadFamilyMembers(); // Reload the list
          setEditingMember(null);
        }}
      />

      <ConnectionTest isOpen={showConnectionTest} onClose={() => setShowConnectionTest(false)} />

      <AuthTest isOpen={showAuthTest} onClose={() => setShowAuthTest(false)} />

      <GoogleCalendarTest
        isOpen={showGoogleCalendarTest}
        onClose={() => setShowGoogleCalendarTest(false)}
      />

      {showErrorDashboard && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900" role="dialog" aria-modal="true" aria-labelledby="error-dashboard-title">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="error-dashboard-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">Error Dashboard</h2>
            <button
              onClick={() => setShowErrorDashboard(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
          <ErrorDashboard />
        </div>
      )}

      <ProfileForm
        isOpen={showProfileForm}
        onClose={() => setShowProfileForm(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      {/*Alvaros - Dailyaffirmations: Removed AffirmationSettings modal (now rendered at App level)*/}

      <SyncSettings isOpen={showSyncSettings} onClose={() => setShowSyncSettings(false)} />

      <TaskSyncSettings isOpen={showTaskSyncSettings} onClose={() => setShowTaskSyncSettings(false)} />

      {showRetailerSearch && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="retailer-modal-title">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 id="retailer-modal-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Manage Retailers
              </h2>
              <button
                onClick={() => setShowRetailerSearch(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close retailer search"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <RetailerSearch userId={user.id} onRetailerSaved={() => {}} />
            </div>
          </div>
        </div>
      )}

      {showAddressManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 id="address-modal-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Manage Addresses
              </h2>
              <button
                onClick={() => setShowAddressManager(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close address manager"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <AddressManager />
            </div>
          </div>
        </div>
      )}

      {showNotificationSettings && (
        <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
      )}
    </div>
  );
}
