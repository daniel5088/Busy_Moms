import React, { useState } from 'react';
import { Heart, Users, Shield, Calendar, MessageCircle, Watch, MapPin, Bell, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import FamilyMemberCard, { FamilyMember } from './onboarding/FamilyMemberCard';
import { ALL as ALL_COLORS } from '../lib/colorPalette';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [preferences, setPreferences] = useState({
    notification_events: true,
    notification_shopping: true,
    notification_reminders: true,
    notification_whatsapp: false,
    whatsapp_integration_enabled: false,
    smartwatch_connected: false,
    background_check_alerts: true
  });
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: 'Welcome to Your Life Assistant',
      subtitle: 'You take care of the love, we\'ll handle the rest.',
      content: (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
            <Heart className="w-16 h-16 text-white" />
          </div>
          <p className="text-gray-600 text-lg leading-relaxed">
            Your AI-powered companion for managing family life, events, and daily tasks with ease.
          </p>
        </div>
      )
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
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="font-medium">{type}</span>
              </div>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'Add Family Members',
      subtitle: 'Optional - You can always add them later in Settings',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Add your children and family members to personalize your experience. Each family member can have their own color for easy organization.
          </p>

          {familyMembers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No family members added yet</p>
              <button
                onClick={() => {
                  const newMember: FamilyMember = {
                    id: crypto.randomUUID(),
                    name: '',
                    relationship: '',
                    color: ALL_COLORS[0]
                  };
                  setFamilyMembers([newMember]);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add First Family Member
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {familyMembers.map((member) => {
                const usedColors = familyMembers
                  .filter(m => m.id !== member.id)
                  .map(m => m.color);

                return (
                  <FamilyMemberCard
                    key={member.id}
                    member={member}
                    usedColors={usedColors}
                    onChange={(updates) => {
                      setFamilyMembers(prev =>
                        prev.map(m => m.id === member.id ? { ...m, ...updates } : m)
                      );
                    }}
                    onRemove={() => {
                      setFamilyMembers(prev => prev.filter(m => m.id !== member.id));
                    }}
                  />
                );
              })}

              <button
                onClick={() => {
                  const usedColors = familyMembers.map(m => m.color);
                  const availableColor = ALL_COLORS.find(c => !usedColors.includes(c)) || ALL_COLORS[0];
                  const newMember: FamilyMember = {
                    id: crypto.randomUUID(),
                    name: '',
                    relationship: '',
                    color: availableColor
                  };
                  setFamilyMembers(prev => [...prev, newMember]);
                }}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Add Another Family Member
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Enable Smart Features',
      subtitle: 'Grant permissions to unlock the full experience',
      content: (
        <div className="space-y-4">
          {[
            { 
              icon: Bell, 
              title: 'Event Notifications', 
              desc: 'Get notified about upcoming events',
              key: 'notification_events'
            },
            { 
              icon: Calendar, 
              title: 'Shopping Alerts', 
              desc: 'Reminders for your shopping lists',
              key: 'notification_shopping'
            },
            { 
              icon: Bell, 
              title: 'General Reminders', 
              desc: 'Never miss important tasks',
              key: 'notification_reminders'
            },
            { 
              icon: MessageCircle, 
              title: 'WhatsApp Integration', 
              desc: 'Parse invitations and reminders',
              key: 'whatsapp_integration_enabled'
            },
            { 
              icon: Watch, 
              title: 'Smartwatch Connection', 
              desc: 'Voice commands and quick actions',
              key: 'smartwatch_connected'
            }
          ].map(({ icon: Icon, title, desc, key }) => (
            <div key={title} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Icon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{title}</h4>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({
                    ...prev,
                    [key]: !prev[key as keyof typeof prev]
                  }))}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    preferences[key as keyof typeof preferences] 
                      ? 'bg-purple-500' 
                      : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${
                    preferences[key as keyof typeof preferences] 
                      ? 'translate-x-6' 
                      : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'You\'re all set!',
      subtitle: 'Ready to make your life easier?',
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <p className="text-gray-600">
            Your AI assistant is ready to help you manage your family life with smart reminders, 
            event planning, and personalized suggestions.
          </p>
          <div className="bg-purple-50 p-4 rounded-xl">
            <p className="text-purple-800 font-medium">
              "What can I help you with today?"
            </p>
          </div>
        </div>
      )
    }
  ];

  const completeOnboarding = async () => {
    if (!user?.id) {
      console.error('No authenticated user found')
      return
    }

    setSaving(true)
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      
      if (!existingProfile) {
        // Profile doesn't exist, create it
        const { error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || 'User',
            user_type: userType as any,
            onboarding_completed: true,
            ai_personality: 'Friendly'
          }])
        
        if (createError) {
          throw new Error(`Failed to create profile: ${createError.message}`)
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            user_type: userType as any,
            onboarding_completed: true
          })
          .eq('id', user.id)
        
        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`)
        }
      }

      // Create or update user preferences
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences
        }, {
          onConflict: 'user_id'
        })
      
      if (preferencesError) {
        throw new Error(`Failed to save preferences: ${preferencesError.message}`)
      }

      // Save family members if any were added
      if (familyMembers.length > 0) {
        const familyMembersToInsert = familyMembers
          .filter(m => m.name.trim() !== '' && m.relationship !== '')
          .map(m => ({
            user_id: user.id,
            name: m.name,
            relationship: m.relationship,
            age: m.age,
            color: m.color
          }));

        if (familyMembersToInsert.length > 0) {
          const { error: familyMembersError } = await supabase
            .from('family_members')
            .insert(familyMembersToInsert);

          if (familyMembersError) {
            console.error('Error saving family members:', familyMembersError);
          }
        }
      }

      console.log('Onboarding completed successfully')
      onComplete()
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
      alert(`Error completing onboarding: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-500">Step {step + 1} of {steps.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {steps[step].title}
          </h1>
          <p className="text-gray-600">
            {steps[step].subtitle}
          </p>
        </div>

        <div className="flex-1">
          {steps[step].content}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={prevStep}
          disabled={step === 0}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            step === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-purple-600 hover:bg-purple-50'
          }`}
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={(step === 1 && !userType) || (step === 2 && familyMembers.some(m => !m.name.trim() || !m.relationship)) || saving}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : step === steps.length - 1 ? 'Get Started' : step === 2 ? (familyMembers.length === 0 ? 'Skip for Now' : 'Continue') : 'Next'}
        </button>
      </div>
    </div>
  );
}