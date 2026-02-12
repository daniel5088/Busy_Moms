import React from 'react';
import { Gift, X } from 'lucide-react';
import { FamilyMember } from '../lib/supabase';
import { getAgeFromBirthday } from '../utils/ageCalculator';

export interface GiftFinderPrefill {
  name: string;
  age?: number;
  gender?: 'Boy' | 'Girl' | 'Other';
  relationship?: string;
  family_member_id: string;
}

interface BirthdayReminderProps {
  member: FamilyMember;
  onGoToGiftFinder: (prefill: GiftFinderPrefill) => void;
  onDismiss: () => void;
}

export function BirthdayReminder({ member, onGoToGiftFinder, onDismiss }: BirthdayReminderProps) {
  const handleFindGift = () => {
    const prefill: GiftFinderPrefill = {
      name: member.name,
      family_member_id: member.id,
    };

    if (member.birthday) {
      const age = getAgeFromBirthday(member.birthday);
      if (age !== null) {
        prefill.age = age;
      }
    }

    if (member.gender) {
      prefill.gender = member.gender;
    }

    if (member.relationship) {
      prefill.relationship = member.relationship;
    }

    onGoToGiftFinder(prefill);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="relative bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl overflow-hidden">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-700/70 transition-colors"
            aria-label="Close reminder"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-pink-500 to-purple-600 dark:from-pink-600 dark:to-purple-700 rounded-full p-6 shadow-lg">
                <Gift className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {member.name}'s birthday is in 2 weeks
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Don't forget to get something special.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={handleFindGift}
                className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 dark:from-pink-600 dark:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-700 dark:hover:from-pink-700 dark:hover:to-purple-800 transition-all duration-200 transform hover:scale-105"
              >
                Find a Gift
              </button>

              <button
                onClick={onDismiss}
                className="w-full px-6 py-3 bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-white/70 dark:hover:bg-gray-700/70 transition-all duration-200"
              >
                Remind me later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
