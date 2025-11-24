import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GiftFinderForm, GiftFinderFormData } from './GiftFinderForm';
import { AffiliateResults } from './AffiliateResults';
import { useAffiliateMatrix } from '../hooks/useAffiliateMatrix';
import { FamilyMember, Event, AffiliateSearchCriteria, supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface GiftFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'form' | 'results';

export function GiftFinderModal({ isOpen, onClose }: GiftFinderModalProps) {
  const { user } = useAuth();

  const {
    lookupValues,
    affiliateResults,
    loading: affiliateLoading,
    error: affiliateError,
    searchAffiliateLinks,
    clearResults: clearAffiliateResults
  } = useAffiliateMatrix();

  const [step, setStep] = useState<Step>('form');
  const [searchCriteria, setSearchCriteria] = useState<GiftFinderFormData | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

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

  const handleSearch = async (formData: GiftFinderFormData, affiliateCriteria?: AffiliateSearchCriteria) => {
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
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Progress Indicator */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                step === 'form' ? 'bg-purple-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <span className={`text-sm font-medium ${step === 'form' ? 'text-purple-600' : 'text-gray-500'}`}>
                Search
              </span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                step === 'results' ? 'bg-purple-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${step === 'results' ? 'text-purple-600' : 'text-gray-500'}`}>
                Results
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Affiliate Error Message */}
        {affiliateError && (
          <div className="px-6 py-3 bg-orange-50 text-orange-700 text-center text-sm">
            <strong>Curated Gifts:</strong> {affiliateError}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'form' && (
            <div className="p-6">
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
            <div className="p-6 space-y-8">
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
                <div className="text-center py-12">
                  <p className="text-gray-500">No gift suggestions found. Try adjusting your search criteria.</p>
                  <button
                    onClick={handleBackToForm}
                    className="mt-4 px-4 py-2 text-pink-600 hover:text-pink-700 font-medium"
                  >
                    Back to Search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
