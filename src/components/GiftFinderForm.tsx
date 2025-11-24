import React, { useState, useEffect } from 'react';
import { Search, X, DollarSign, User, Calendar, Users, Heart } from 'lucide-react';
import { FamilyMember, Event, GiftCategory, AffiliateMatrixLookup, AffiliateSearchCriteria } from '../lib/supabase';

interface GiftFinderFormProps {
  familyMembers: FamilyMember[];
  events: Event[];
  categories?: GiftCategory[];
  affiliateLookup?: AffiliateMatrixLookup | null;
  onSearch: (formData: GiftFinderFormData, affiliateCriteria?: AffiliateSearchCriteria) => void;
  onClose: () => void;
  loading?: boolean;
}

export interface GiftFinderFormData {
  recipient_name: string;
  recipient_age: number;
  recipient_gender: 'Boy' | 'Girl' | 'Other';
  budget_min: number;
  budget_max: number;
  event_id?: string;
  family_member_id?: string;
  category?: GiftCategory;
  // Affiliate matrix fields
  relationship_key?: string;
  age_group_key?: string;
  gender_key?: string;
  budget_key?: string;
}

export function GiftFinderForm({
  familyMembers,
  events,
  categories,
  affiliateLookup,
  onSearch,
  onClose,
  loading = false
}: GiftFinderFormProps) {
  const [formData, setFormData] = useState<GiftFinderFormData>({
    recipient_name: '',
    recipient_age: 8,
    recipient_gender: 'Other',
    budget_min: 10,
    budget_max: 50,
    event_id: undefined,
    family_member_id: undefined,
    category: undefined,
    relationship_key: undefined,
    age_group_key: undefined,
    gender_key: undefined,
    budget_key: undefined
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GiftFinderFormData, string>>>({});

  // Mapping functions to convert affiliate matrix selections to form values
  const mapAgeGroupToAge = (ageGroupLabel: string): number => {
    // Extract numbers from age group labels like "0-5", "6-12", "13-18", "18+"
    const match = ageGroupLabel.match(/^(\d+)(?:-(\d+))?/);
    if (match) {
      const min = parseInt(match[1], 10);
      const max = match[2] ? parseInt(match[2], 10) : min;
      // Return the middle point of the range
      return Math.floor((min + max) / 2);
    }
    // For text-only labels like "Adult", return a default
    return 20;
  };

  const mapGenderKeyToGender = (genderLabel: string): 'Boy' | 'Girl' | 'Other' => {
    const normalized = genderLabel.toLowerCase();
    if (normalized.includes('boy') || normalized.includes('male')) return 'Boy';
    if (normalized.includes('girl') || normalized.includes('female')) return 'Girl';
    return 'Other';
  };

  const mapBudgetKeyToRange = (budgetLabel: string): { min: number; max: number } => {
    // Remove dollar signs and extract numbers
    const cleanedLabel = budgetLabel.replace(/\$/g, '');

    // Check for "Under X" pattern
    const underMatch = cleanedLabel.match(/under\s*(\d+)/i);
    if (underMatch) {
      return { min: 0, max: parseInt(underMatch[1], 10) };
    }

    // Check for "X+" pattern
    const plusMatch = cleanedLabel.match(/(\d+)\+/);
    if (plusMatch) {
      const min = parseInt(plusMatch[1], 10);
      return { min, max: Math.max(min + 300, 500) };
    }

    // Check for "X-Y" pattern
    const rangeMatch = cleanedLabel.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1], 10),
        max: parseInt(rangeMatch[2], 10)
      };
    }

    // Fallback to default budget
    return { min: 10, max: 50 };
  };

  // Auto-populate recipient age when age group is selected
  useEffect(() => {
    if (formData.age_group_key && affiliateLookup) {
      const selectedAgeGroup = affiliateLookup.ageGroups.find(ag => ag.key === formData.age_group_key);
      if (selectedAgeGroup) {
        const age = mapAgeGroupToAge(selectedAgeGroup.label);
        setFormData(prev => ({ ...prev, recipient_age: age }));
      }
    }
  }, [formData.age_group_key, affiliateLookup]);

  // Auto-populate recipient gender when gender is selected
  useEffect(() => {
    if (formData.gender_key && affiliateLookup) {
      const selectedGender = affiliateLookup.genders.find(g => g.key === formData.gender_key);
      if (selectedGender) {
        const gender = mapGenderKeyToGender(selectedGender.label);
        setFormData(prev => ({ ...prev, recipient_gender: gender }));
      }
    }
  }, [formData.gender_key, affiliateLookup]);

  // Auto-populate budget when budget range is selected
  useEffect(() => {
    if (formData.budget_key && affiliateLookup) {
      const selectedBudget = affiliateLookup.budgets.find(b => b.key === formData.budget_key);
      if (selectedBudget) {
        const { min, max } = mapBudgetKeyToRange(selectedBudget.label);
        setFormData(prev => ({ ...prev, budget_min: min, budget_max: max }));
      }
    }
  }, [formData.budget_key, affiliateLookup]);

  const handleFamilyMemberSelect = (memberId: string) => {
    if (!memberId) {
      setFormData(prev => ({
        ...prev,
        family_member_id: undefined,
        recipient_name: '',
        recipient_age: 8,
        recipient_gender: 'Other'
      }));
      return;
    }

    const member = familyMembers.find(m => m.id === memberId);
    if (member) {
      setFormData(prev => ({
        ...prev,
        family_member_id: member.id,
        recipient_name: member.name,
        recipient_age: member.age || 8,
        recipient_gender: member.gender || 'Other'
      }));
    }
  };

  const handleBudgetPreset = (min: number, max: number) => {
    setFormData(prev => ({
      ...prev,
      budget_min: min,
      budget_max: max
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof GiftFinderFormData, string>> = {};

    // Only validate recipient info if family member is selected
    if (formData.family_member_id) {
      if (!formData.recipient_name.trim()) {
        newErrors.recipient_name = 'Recipient name is required';
      }

      if (formData.recipient_age < 0 || formData.recipient_age > 25) {
        newErrors.recipient_age = 'Age must be between 0 and 25';
      }
    }

    if (formData.budget_min < 0) {
      newErrors.budget_min = 'Minimum budget must be positive';
    }

    if (formData.budget_max < formData.budget_min) {
      newErrors.budget_max = 'Maximum budget must be greater than minimum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      // Build affiliate search criteria
      const affiliateCriteria: AffiliateSearchCriteria | undefined =
        formData.relationship_key || formData.age_group_key || formData.gender_key || formData.budget_key
          ? {
              relationship_key: formData.relationship_key,
              age_group_key: formData.age_group_key,
              gender_key: formData.gender_key,
              budget_key: formData.budget_key
            }
          : undefined;

      onSearch(formData, affiliateCriteria);
    }
  };

  const handleClear = () => {
    setFormData({
      recipient_name: '',
      recipient_age: 8,
      recipient_gender: 'Other',
      budget_min: 10,
      budget_max: 50,
      event_id: undefined,
      family_member_id: undefined,
      category: undefined,
      relationship_key: undefined,
      age_group_key: undefined,
      gender_key: undefined,
      budget_key: undefined
    });
    setErrors({});
  };

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    const now = new Date();
    return eventDate >= now;
  }).slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Find Gift Ideas</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Fill Section */}
      {familyMembers.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Quick Fill from Family
          </h3>
          <select
            value={formData.family_member_id || ''}
            onChange={(e) => handleFamilyMemberSelect(e.target.value)}
            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select a family member...</option>
            {familyMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name} {member.age ? `(Age ${member.age})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Affiliate Matrix Filters - Curated Gift Discovery */}
      {affiliateLookup && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-4 space-y-4 border border-pink-200">
          <h3 className="text-sm font-semibold text-pink-900 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Browse Curated Gift Ideas
          </h3>
          <p className="text-xs text-gray-600">
            Select options to discover hand-picked affiliate gift suggestions
          </p>

          {/* Show message if no options available */}
          {affiliateLookup.relationships.length === 0 &&
           affiliateLookup.ageGroups.length === 0 &&
           affiliateLookup.genders.length === 0 &&
           affiliateLookup.budgets.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              No curated gift options are currently available. Please check back later or use the recipient information below.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Relationship Dropdown */}
            <div>
              <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                Relationship
              </label>
              <select
                id="relationship"
                value={formData.relationship_key || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, relationship_key: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                <option value="">Select relationship...</option>
                {affiliateLookup.relationships.map(rel => (
                  <option key={rel.key} value={rel.key}>
                    {rel.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Group Dropdown */}
            <div>
              <label htmlFor="age_group" className="block text-sm font-medium text-gray-700 mb-1">
                Age Group
              </label>
              <select
                id="age_group"
                value={formData.age_group_key || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, age_group_key: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                <option value="">Select age group...</option>
                {affiliateLookup.ageGroups.map(age => (
                  <option key={age.key} value={age.key}>
                    {age.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Dropdown */}
            <div>
              <label htmlFor="affiliate_gender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                id="affiliate_gender"
                value={formData.gender_key || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, gender_key: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                <option value="">Select gender...</option>
                {affiliateLookup.genders.map(gender => (
                  <option key={gender.key} value={gender.key}>
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Dropdown */}
            <div>
              <label htmlFor="affiliate_budget" className="block text-sm font-medium text-gray-700 mb-1">
                Budget Range
              </label>
              <select
                id="affiliate_budget"
                value={formData.budget_key || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_key: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              >
                <option value="">Select budget...</option>
                {affiliateLookup.budgets.map(budget => (
                  <option key={budget.key} value={budget.key}>
                    {budget.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Information - Only shown when family member is selected */}
      {formData.family_member_id && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5" />
            Recipient Information
          </h3>

          {/* Name */}
          <div>
            <label htmlFor="recipient_name" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Name *
            </label>
            <input
              type="text"
              id="recipient_name"
              value={formData.recipient_name}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.recipient_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Who is this gift for?"
            />
            {errors.recipient_name && (
              <p className="mt-1 text-sm text-red-600">{errors.recipient_name}</p>
            )}
          </div>

          {/* Age */}
          <div>
            <label htmlFor="recipient_age" className="block text-sm font-medium text-gray-700 mb-1">
              Age *
            </label>
            <input
              type="number"
              id="recipient_age"
              min="0"
              max="25"
              value={formData.recipient_age}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient_age: parseInt(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.recipient_age ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.recipient_age && (
              <p className="mt-1 text-sm text-red-600">{errors.recipient_age}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <div className="flex gap-4">
              {(['Boy', 'Girl', 'Other'] as const).map(gender => (
                <label key={gender} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={gender}
                    checked={formData.recipient_gender === gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipient_gender: e.target.value as 'Boy' | 'Girl' | 'Other' }))}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{gender === 'Other' ? 'Unisex' : gender}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Event Link */}
          {upcomingEvents.length > 0 && (
            <div>
              <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Link to Event (Optional)
              </label>
              <select
                id="event_id"
                value={formData.event_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, event_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">No event</option>
                {upcomingEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {new Date(event.event_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Budget Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Budget
        </h3>

        {/* Budget Presets */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Under $10', min: 0, max: 10 },
            { label: '$10-25', min: 10, max: 25 },
            { label: '$25-50', min: 25, max: 50 },
            { label: '$50-100', min: 50, max: 100 },
            { label: '$100+', min: 100, max: 500 }
          ].map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleBudgetPreset(preset.min, preset.max)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                formData.budget_min === preset.min && formData.budget_max === preset.max
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Budget */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="budget_min" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum $
            </label>
            <input
              type="number"
              id="budget_min"
              min="0"
              step="5"
              value={formData.budget_min}
              onChange={(e) => setFormData(prev => ({ ...prev, budget_min: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.budget_min ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.budget_min && (
              <p className="mt-1 text-sm text-red-600">{errors.budget_min}</p>
            )}
          </div>
          <div>
            <label htmlFor="budget_max" className="block text-sm font-medium text-gray-700 mb-1">
              Maximum $
            </label>
            <input
              type="number"
              id="budget_max"
              min="0"
              step="5"
              value={formData.budget_max}
              onChange={(e) => setFormData(prev => ({ ...prev, budget_max: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.budget_max ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.budget_max && (
              <p className="mt-1 text-sm text-red-600">{errors.budget_max}</p>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      {categories && categories.length > 0 && (
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category (Optional)
          </label>
          <select
            id="category"
            value={formData.category || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as GiftCategory || undefined }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Clear Form
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Find Gifts</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
