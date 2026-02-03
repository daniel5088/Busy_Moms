import React, { useState, useEffect } from 'react';
import { ArrowLeft, Gift } from 'lucide-react';
import { GiftFinderForm, GiftFinderFormData } from './GiftFinderForm';
import { AffiliateResults } from './AffiliateResults';
import { useAffiliateMatrix } from '../hooks/useAffiliateMatrix';
import { FamilyMember, Event, AffiliateSearchCriteria, supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface GiftFinderProps {
  onBack: () => void;
}

type Step = 'form' | 'results';

export default function GiftFinder({ onBack }: GiftFinderProps) {
  const { user } = useAuth();

  const {
    lookupValues,
    affiliateResults,
    loading: affiliateLoading,
    error: affiliateError,
    searchAffiliateLinks,
    clearResults: clearAffiliateResults,
  } = useAffiliateMatrix();

  const [step, setStep] = useState<Step>('form');
  const [searchCriteria, setSearchCriteria] = useState<GiftFinderFormData | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id || !supabase) return;

    try {
      // Load family members
      const { data: members } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (members) setFamilyMembers(members);

      // Load upcoming events
      const today = new Date().toISOString().split('T')[0];
      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', today)
        .order('event_date')
        .limit(20);

      if (upcomingEvents) setEvents(upcomingEvents);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleSearch = async (
    formData: GiftFinderFormData,
    affiliateCriteria?: AffiliateSearchCriteria
  ) => {
    setSearchCriteria(formData);

    // Search affiliate matrix if criteria provided
    if (affiliateCriteria) {
      const results = await searchAffiliateLinks(affiliateCriteria);

      // Always show results step (even if no results found)
      setStep('results');
    } else {
      clearAffiliateResults();
    }
  };

  const handleBackToForm = () => {
    setStep('form');
  };

  const handleClose = () => {
    // Reset state when closing
    setStep('form');
    setSearchCriteria(null);
    clearAffiliateResults();
    onBack();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="flex items-center gap-2">
                <Gift className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Gift Finder</h1>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    step === 'form' ? 'bg-pink-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  1
                </div>
                <span
                  className={`text-sm font-medium ${step === 'form' ? 'text-pink-600 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Search
                </span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    step === 'results' ? 'bg-pink-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  2
                </div>
                <span
                  className={`text-sm font-medium ${step === 'results' ? 'text-pink-600 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Results
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliate Error Message */}
      {affiliateError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-center text-sm">
          <strong>Curated Gifts:</strong> {affiliateError}
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {step === 'form' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <GiftFinderForm
              familyMembers={familyMembers}
              events={events}
              affiliateLookup={lookupValues}
              onSearch={handleSearch}
              onClose={handleClose}
              loading={affiliateLoading}
            />
          </div>
        )}

        {step === 'results' && searchCriteria && (
          <div className="space-y-8">
            {/* Affiliate Results Section */}
            {affiliateResults.length > 0 ? (
              <AffiliateResults
                results={affiliateResults}
                onLinkClick={(url, item) => {
                  console.log('Affiliate link clicked:', url, item);
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No gift suggestions found. Try adjusting your search criteria.
                </p>
                <button
                  onClick={handleBackToForm}
                  className="mt-4 px-4 py-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium"
                >
                  Back to Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
