import React, { useState, useRef } from 'react';
import { X, User, Heart, School, Mail, Calendar } from 'lucide-react';
import { supabase, FamilyMember } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { getAgeFromBirthday } from '../../utils/ageCalculator';
import {
  createBirthdayEventsForNext100Years,
  updateBirthdayEvents,
} from '../../services/birthdayEventsService';

interface FamilyMemberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberCreated: (member: FamilyMember) => void;
  editMember?: FamilyMember | null;
}

export function FamilyMemberForm({
  isOpen,
  onClose,
  onMemberCreated,
  editMember,
}: FamilyMemberFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const originalBirthdayRef = useRef<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    Email: '',
    relationship: 'Child',
    birthdayMonth: '',
    birthdayDay: '',
    birthdayYear: '',
    gender: 'Other',
    allergies: '',
    medical_notes: '',
    school: '',
    grade: '',
  });

  // Update form data when editMember changes
  React.useEffect(() => {
    if (editMember) {
      let month = '';
      let day = '';
      let year = '';

      if (editMember.birthday) {
        originalBirthdayRef.current = editMember.birthday;
        const date = new Date(editMember.birthday);
        if (!isNaN(date.getTime())) {
          month = String(date.getMonth() + 1).padStart(2, '0');
          day = String(date.getDate()).padStart(2, '0');
          year = String(date.getFullYear());
        }
      } else {
        originalBirthdayRef.current = null;
      }

      setFormData({
        name: editMember.name || '',
        Email: editMember.Email || '',
        relationship: editMember.relationship || 'Child',
        birthdayMonth: month,
        birthdayDay: day,
        birthdayYear: year,
        gender: editMember.gender || 'Other',
        allergies: editMember.allergies?.join(', ') || '',
        medical_notes: editMember.medical_notes || '',
        school: editMember.school || '',
        grade: editMember.grade || '',
      });
    } else {
      originalBirthdayRef.current = null;
      // Reset form for new member
      setFormData({
        name: '',
        Email: '',
        relationship: 'Child',
        birthdayMonth: '',
        birthdayDay: '',
        birthdayYear: '',
        gender: 'Other',
        allergies: '',
        medical_notes: '',
        school: '',
        grade: '',
      });
    }
  }, [editMember]);

  // Determine if school/grade fields should be shown (hide for Parent, Spouse, Grandparent)
  const showSchoolFields =
    formData.relationship !== 'Parent' &&
    formData.relationship !== 'Spouse' &&
    formData.relationship !== 'Grandparent';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      // Ensure we have a valid authenticated user
      if (!user?.id) {
        throw new Error('You must be logged in to add family members.');
      }

      let birthday: string | null = null;
      if (formData.birthdayMonth && formData.birthdayDay && formData.birthdayYear) {
        const month = parseInt(formData.birthdayMonth);
        const day = parseInt(formData.birthdayDay);
        const year = parseInt(formData.birthdayYear);

        if (month < 1 || month > 12) {
          throw new Error('Month must be between 1 and 12');
        }
        if (day < 1 || day > 31) {
          throw new Error('Day must be between 1 and 31');
        }
        if (year < 1900 || year > new Date().getFullYear()) {
          throw new Error('Please enter a valid birth year');
        }

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const testDate = new Date(dateStr);
        if (isNaN(testDate.getTime())) {
          throw new Error('Please enter a valid date');
        }
        if (testDate > new Date()) {
          throw new Error('Birthday cannot be in the future');
        }

        birthday = dateStr;
      }

      const memberData: any = {
        user_id: user.id,
        name: formData.name,
        Email: formData.Email,
        relationship: formData.relationship,
        birthday: birthday,
        birthday_estimated: false,
        gender: formData.gender,
        allergies: formData.allergies
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a),
        medical_notes: formData.medical_notes,
        school: showSchoolFields ? formData.school : '',
        grade: showSchoolFields ? formData.grade : '',
      };

      let result;
      if (editMember) {
        // Update existing family member
        result = await supabase
          .from('family_members')
          .update(memberData)
          .eq('id', editMember.id)
          .select()
          .single();
      } else {
        // Insert new family member
        result = await supabase.from('family_members').insert([memberData]).select().single();
      }

      if (result.error) {
        throw result.error;
      }

      const savedMember = result.data;

      if (editMember) {
        const birthdayChanged = originalBirthdayRef.current !== birthday;
        if (birthdayChanged && savedMember.birthday) {
          try {
            console.log(`🎂 Updating birthday events for ${savedMember.name} (ID: ${savedMember.id})`);
            const updateResult = await updateBirthdayEvents(savedMember, originalBirthdayRef.current);
            if (updateResult.success) {
              console.log(`✅ Successfully updated birthday events for ${savedMember.name}`);
            } else {
              console.error(`❌ Failed to update birthday events for ${savedMember.name}:`, updateResult.error);
            }
          } catch (error) {
            console.error(`❌ Error updating birthday events for ${savedMember.name}:`, error);
          }
        }
      } else if (savedMember.birthday) {
        try {
          console.log(`🎂 Creating birthday events for ${savedMember.name} (ID: ${savedMember.id})`);
          const createResult = await createBirthdayEventsForNext100Years(savedMember);
          if (createResult.success) {
            console.log(`✅ Successfully created ${createResult.eventsCreated} birthday events for ${savedMember.name}`);
          } else {
            console.error(`❌ Failed to create birthday events for ${savedMember.name}:`, createResult.error);
          }
        } catch (error) {
          console.error(`❌ Error creating birthday events for ${savedMember.name}:`, error);
        }
      }

      // Call the callback with the saved member
      onMemberCreated(savedMember);
      onClose();

      // Reset form
      setFormData({
        name: '',
        Email: '',
        relationship: 'Child',
        birthdayMonth: '',
        birthdayDay: '',
        birthdayYear: '',
        gender: 'Other',
        allergies: '',
        medical_notes: '',
        school: '',
        grade: '',
      });
    } catch (error: any) {
      console.error('Error saving family member:', error);
      setError(`Error saving family member: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {editMember ? 'Edit Family Member' : 'Add Family Member'}
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {error && (
              <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                <User className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Family member's name"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.Email}
                onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                placeholder="email@example.com (for sharing tasks/events)"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Add email to assign and share items with this family member
              </p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Relationship *
              </label>
              <select
                required
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="Child">Child</option>
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Extended Family">Extended Family</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Birthday
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={2}
                  value={formData.birthdayMonth}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, birthdayMonth: value });
                  }}
                  className="w-16 px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base text-center"
                  placeholder="MM"
                />
                <span className="text-gray-400 dark:text-gray-500 self-center">/</span>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.birthdayDay}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, birthdayDay: value });
                  }}
                  className="w-16 px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base text-center"
                  placeholder="DD"
                />
                <span className="text-gray-400 dark:text-gray-500 self-center">/</span>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.birthdayYear}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, birthdayYear: value });
                  }}
                  className="w-20 px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base text-center"
                  placeholder="YYYY"
                />
              </div>
              {editMember?.birthday_estimated && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Birthday is estimated—tap to update.
                </p>
              )}
              {formData.birthdayMonth && formData.birthdayDay && formData.birthdayYear && (() => {
                const birthdayString = `${formData.birthdayYear}-${String(formData.birthdayMonth).padStart(2, '0')}-${String(formData.birthdayDay).padStart(2, '0')}`;
                const computedAge = getAgeFromBirthday(birthdayString);

                return (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Age: {computedAge !== null && computedAge !== undefined ? computedAge : 'Invalid date'}
                    </p>
                    {computedAge === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Age appears to be 0. Please confirm the birthday is correct.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {showSchoolFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    <School className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    School
                  </label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="School name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="e.g., 2nd Grade, K"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Allergies
              </label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Peanuts, Dairy, etc. (comma separated)"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Medical Notes
              </label>
              <textarea
                value={formData.medical_notes}
                onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                rows={2}
                placeholder="Important medical information, medications, etc."
              />
            </div>

            <div className="flex space-x-2 sm:space-x-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 py-2 sm:px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? 'Saving...' : editMember ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}