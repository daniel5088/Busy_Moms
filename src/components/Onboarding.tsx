import React, { useState } from 'react';
import {
  Heart,
  Users,
  Shield,
  Sun,
  Moon,
  Smartphone,
  Ruler,
  Sparkles,
  Calendar,
  Bell,
  MapPin,
  ShoppingCart,
  UserPlus,
  LogOut,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import FamilyMemberCard, { FamilyMember } from './onboarding/FamilyMemberCard';
import { ALL as ALL_COLORS } from '../lib/colorPalette';
import { createBirthdayEventsForNext100Years } from '../services/birthdayEventsService';
import { ConnectGoogleCalendarButton } from './ConnectGoogleCalendarButton';
import { NotificationSettings } from './NotificationSettings';
import { AddressManager } from './AddressManager';
import { RetailerSelectionModal } from './RetailerSelectionModal';
import { measurementPreferencesService } from '../services/measurementPreferencesService';

interface OnboardingProps {
  onComplete: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function Onboarding({ onComplete, darkMode, toggleDarkMode }: OnboardingProps) {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for settings configuration step
  const [measurementSystem, setMeasurementSystem] = useState<'metric' | 'imperial' | null>(null);

  // Modal states for optional configurations
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showRetailerModal, setShowRetailerModal] = useState(false);

  // Load measurement preference on mount
  React.useEffect(() => {
    if (!user?.id) return;

    const loadMeasurementPreference = async () => {
      try {
        const { data } = await supabase
          .from('user_measurement_preferences')
          .select('preferred_system')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setMeasurementSystem(data.preferred_system);
        } else {
          setMeasurementSystem('imperial');
        }
      } catch (error) {
        console.error('Error loading measurement preference:', error);
        setMeasurementSystem('imperial');
      }
    };

    loadMeasurementPreference();
  }, [user?.id]);

  const steps = [
    {
      title: 'Welcome to Your Life Assistant',
      subtitle: "You take care of the love, we'll handle the rest.",
      content: (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-rose-400 via-pink-400 to-orange-300 rounded-full flex items-center justify-center">
            <Heart className="w-16 h-16 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            Your AI-powered companion for managing family life, events, and daily tasks with ease.
          </p>
        </div>
      ),
    },
    {
      title: 'Tell us about yourself',
      subtitle: 'This helps us personalize your experience',
      content: (
        <div className="space-y-4">
          {['Mom', 'Dad', 'Guardian', 'Other'].map((type) => (
            <button
              key={type}
              onClick={() => setUserType(type)}
              className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                userType === type
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className={`w-5 h-5 ${userType === type ? 'text-rose-500 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'}`} />
                <span className={`font-medium ${userType === type ? 'text-rose-900 dark:text-rose-200' : 'text-gray-900 dark:text-gray-100'}`}>{type}</span>
              </div>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Add Family Members',
      subtitle: 'Optional - You can always add them later in Settings',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Add your children and family members to personalize your experience. Each family member
            can have their own color for easy organization.
          </p>

          {familyMembers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
              <Users className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">No family members added yet</p>
              <button
                onClick={() => {
                  const newMember: FamilyMember = {
                    id: crypto.randomUUID(),
                    name: '',
                    relationship: '',
                    gender: 'Other',
                    school: '',
                    grade: '',
                    allergies: [],
                    medical_notes: '',
                    color: ALL_COLORS[0],
                  };
                  setFamilyMembers([newMember]);
                }}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add First Family Member
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {familyMembers.map((member) => {
                const usedColors = familyMembers
                  .filter((m) => m.id !== member.id)
                  .map((m) => m.color);

                return (
                  <FamilyMemberCard
                    key={member.id}
                    member={member}
                    usedColors={usedColors}
                    onChange={(updates) => {
                      setFamilyMembers((prev) =>
                        prev.map((m) => (m.id === member.id ? { ...m, ...updates } : m))
                      );
                    }}
                    onRemove={() => {
                      setFamilyMembers((prev) => prev.filter((m) => m.id !== member.id));
                    }}
                  />
                );
              })}

              <button
                onClick={() => {
                  const usedColors = familyMembers.map((m) => m.color);
                  const availableColor =
                    ALL_COLORS.find((c) => !usedColors.includes(c)) || ALL_COLORS[0];
                  const newMember: FamilyMember = {
                    id: crypto.randomUUID(),
                    name: '',
                    relationship: '',
                    gender: 'Other',
                    school: '',
                    grade: '',
                    allergies: [],
                    medical_notes: '',
                    color: availableColor,
                  };
                  setFamilyMembers((prev) => [...prev, newMember]);
                }}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Add Another Family Member
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Configure Settings',
      subtitle: 'Set up your preferences - you can change these later in Settings',
      content: (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {/* Dark Mode */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center">
                  <Moon className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Switch between light and dark themes
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  darkMode ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${
                    darkMode ? 'right-0.5' : 'left-0.5'
                  }`}
                ></div>
              </button>
            </div>
          </div>

          {/* Measurement System */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Measurement System</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {measurementSystem === 'metric'
                      ? 'Using Metric (grams, ml, kg)'
                      : measurementSystem === 'imperial'
                        ? 'Using Imperial (cups, oz, lbs)'
                        : 'Choose your preferred system'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMeasurementSystem('metric')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    measurementSystem === 'metric'
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Metric
                </button>
                <button
                  onClick={() => setMeasurementSystem('imperial')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    measurementSystem === 'imperial'
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Imperial
                </button>
              </div>
            </div>
          </div>

          {/* Daily Affirmations */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Daily Affirmations</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Personalized encouragement every day
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-affirmations'))}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Manage
              </button>
            </div>
          </div>

          {/* Connect Google Calendar */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Connect Google Calendar</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sync your events with Google Calendar
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <ConnectGoogleCalendarButton />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Notification Preferences</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Customize notification settings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationsModal(true)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Manage
              </button>
            </div>
          </div>

          {/* Home Address */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Home Address</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Set your default location
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddressModal(true)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Manage
              </button>
            </div>
          </div>

          {/* Instacart Retailers */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Preferred Retailers</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select your favorite grocery stores
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRetailerModal(true)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Manage
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "You're all set!",
      subtitle: 'Ready to make your life easier?',
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Your AI assistant is ready to help you manage your family life with smart reminders,
            event planning, and personalized suggestions.
          </p>
          <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800">
            <p className="text-rose-800 dark:text-rose-200 font-medium">"What can I help you with today?"</p>
          </div>
        </div>
      ),
    },
  ];

  const completeOnboarding = async () => {
    if (!user?.id) {
      console.error('No authenticated user found');
      return;
    }

    setSaving(true);
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Profile doesn't exist, create it
        const { error: createError } = await supabase.from('profiles').insert([
          {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || 'User',
            user_type: userType as any,
            onboarding_completed: true,
            ai_personality: 'Friendly',
          },
        ]);

        if (createError) {
          throw new Error(`Failed to create profile: ${createError.message}`);
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            user_type: userType as any,
            onboarding_completed: true,
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }
      }

      // Save measurement preferences if selected
      if (measurementSystem) {
        try {
          await measurementPreferencesService.setPreferredSystem(user.id, measurementSystem);
        } catch (prefError) {
          console.warn('Could not save measurement preferences:', prefError);
        }
      }

      // Save family members if any were added
      if (familyMembers.length > 0) {
        const familyMembersToInsert = familyMembers
          .filter((m) => m.name.trim() !== '' && m.relationship !== '')
          .map((m) => {
            let birthday: string | null = null;
            if (m.birthdayMonth && m.birthdayDay && m.birthdayYear) {
              const month = String(m.birthdayMonth).padStart(2, '0');
              const day = String(m.birthdayDay).padStart(2, '0');
              birthday = `${m.birthdayYear}-${month}-${day}`;
            }

            return {
              user_id: user.id,
              name: m.name,
              relationship: m.relationship,
              birthday: birthday,
              birthday_estimated: false,
              gender: m.gender || 'Other',
              school: m.school || '',
              grade: m.grade || '',
              allergies: m.allergies || [],
              medical_notes: m.medical_notes || '',
              color: m.color,
            };
          });

        if (familyMembersToInsert.length > 0) {
          const { data: insertedMembers, error: familyMembersError } = await supabase
            .from('family_members')
            .insert(familyMembersToInsert)
            .select();

          if (familyMembersError) {
            console.error('Error saving family members:', familyMembersError);
          } else if (insertedMembers) {
            let birthdayEventSuccesses = 0;
            let birthdayEventFailures = 0;

            for (const member of insertedMembers) {
              if (member.birthday) {
                try {
                  console.log(`🎂 Creating birthday events for ${member.name} (ID: ${member.id}) during onboarding`);
                  const result = await createBirthdayEventsForNext100Years(member);
                  if (result.success) {
                    birthdayEventSuccesses++;
                    console.log(`✅ Successfully created ${result.eventsCreated} birthday events for ${member.name}`);
                  } else {
                    birthdayEventFailures++;
                    console.error(`❌ Failed to create birthday events for ${member.name}:`, result.error);
                  }
                } catch (error) {
                  birthdayEventFailures++;
                  console.error(`❌ Error creating birthday events for ${member.name}:`, error);
                }
              }
            }

            if (birthdayEventFailures > 0) {
              console.warn(`⚠️ Birthday events: ${birthdayEventSuccesses} succeeded, ${birthdayEventFailures} failed`);
            } else if (birthdayEventSuccesses > 0) {
              console.log(`✅ All birthday events created successfully (${birthdayEventSuccesses} members)`);
            }
          }
        }
      }

      console.log('Onboarding completed successfully');
      setError(null);
      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out? You will need to sign in again.')) {
      await signOut();
      window.location.reload();
    }
  };

  return (
    <div className="h-screen flex flex-col p-6 bg-gray-50 dark:bg-gray-900">
      {/* Header with Sign Out button */}
      <header className="flex justify-end mb-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                Error Completing Onboarding
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    completeOnboarding();
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main onboarding content area */}
      <main className="flex-1 flex flex-col">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{steps[step].title}</h1>
            <p className="text-gray-600 dark:text-gray-300">{steps[step].subtitle}</p>
          </div>

          <div className="flex-1">{steps[step].content}</div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              step === 0 ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
            }`}
          >
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={
              (step === 1 && !userType) ||
              (step === 2 && familyMembers.some((m) => !m.name.trim() || !m.relationship)) ||
              (step === 3 && !measurementSystem) ||
              saving
            }
            className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? 'Saving...'
              : step === steps.length - 1
                ? 'Get Started'
                : step === 2
                  ? familyMembers.length === 0
                    ? 'Skip for Now'
                    : 'Continue'
                  : 'Continue'}
          </button>
        </div>
      </main>

      {/* Modals for Type B optional configurations */}
      {showNotificationsModal && (
        <NotificationSettings onClose={() => setShowNotificationsModal(false)} />
      )}

      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 id="address-modal-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Manage Addresses
              </h2>
              <button
                onClick={() => setShowAddressModal(false)}
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

      {showRetailerModal && (
        <RetailerSelectionModal
          isOpen={showRetailerModal}
          onClose={() => setShowRetailerModal(false)}
        />
      )}
    </div>
  );
}
