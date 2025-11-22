import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GiftFinderForm, GiftFinderFormData } from './GiftFinderForm';
import { GiftResultsDisplay } from './GiftResultsDisplay';
import { useGiftMatrix } from '../hooks/useGiftMatrix';
import { FamilyMember, Event, GiftMatrixItem, supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface GiftFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'form' | 'results';

export function GiftFinderModal({ isOpen, onClose }: GiftFinderModalProps) {
  const { user } = useAuth();
  const {
    gifts,
    categories,
    loading,
    error,
    searchGifts,
    loadCategories,
    handleAffiliateClick,
    saveSearch
  } = useGiftMatrix();

  const [step, setStep] = useState<Step>('form');
  const [searchCriteria, setSearchCriteria] = useState<GiftFinderFormData | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [clickingGiftId, setClickingGiftId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadCategories();
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

  const handleSearch = async (formData: GiftFinderFormData) => {
    setSearchCriteria(formData);

    const results = await searchGifts({
      age: formData.recipient_age,
      gender: formData.recipient_gender,
      budgetMin: formData.budget_min,
      budgetMax: formData.budget_max,
      category: formData.category,
      tags: []
    });

    if (results.length > 0) {
      setStep('results');
    }
  };

  const handleBackToForm = () => {
    setStep('form');
  };

  const handleSaveSearch = async () => {
    if (!user?.id || !searchCriteria) return;

    try {
      await saveSearch(user.id, {
        recipient_name: searchCriteria.recipient_name,
        recipient_age: searchCriteria.recipient_age,
        recipient_gender: searchCriteria.recipient_gender,
        budget_min: searchCriteria.budget_min,
        budget_max: searchCriteria.budget_max,
        event_id: searchCriteria.event_id,
        family_member_id: searchCriteria.family_member_id,
        matching_gift_ids: gifts.map(g => g.id)
      });

      setSaveMessage('Search saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage('Failed to save search');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleGiftClick = async (gift: GiftMatrixItem) => {
    setClickingGiftId(gift.id);
    try {
      await handleAffiliateClick(gift);
    } catch (err) {
      console.error('Error handling gift click:', err);
    } finally {
      setClickingGiftId(null);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep('form');
    setSearchCriteria(null);
    setSaveMessage(null);
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

        {/* Save Message */}
        {saveMessage && (
          <div className={`px-6 py-3 text-center font-medium ${
            saveMessage.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 text-red-700 text-center font-medium">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'form' && (
            <div className="p-6">
              <GiftFinderForm
                familyMembers={familyMembers}
                events={events}
                categories={categories}
                onSearch={handleSearch}
                onClose={handleClose}
                loading={loading}
              />
            </div>
          )}

          {step === 'results' && searchCriteria && (
            <div className="p-6">
              <GiftResultsDisplay
                gifts={gifts}
                searchCriteria={searchCriteria}
                onBackToForm={handleBackToForm}
                onSaveSearch={handleSaveSearch}
                onGiftClick={handleGiftClick}
                loading={loading}
                clickingGiftId={clickingGiftId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
