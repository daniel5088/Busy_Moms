//Alvaros - Dailyaffirmations: This is the unified Daily Affirmations notification settings modal
//This modal controls WHEN affirmations are delivered (notification scheduling) and WHAT data sources
//are used to generate them. This is separate from the DailyAffirmations component which shows history.
//This modal is accessible from both Settings → Notifications → Daily Affirmations and More → Daily Affirmations

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Bell,
  Calendar as CalendarIcon,
  ShoppingBag,
  Users,
  CheckSquare,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { affirmationService } from '../services/affirmationService';
import { AffirmationSettings as AffirmationSettingsType } from '../lib/supabase';

interface AffirmationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AffirmationSettings({ isOpen, onClose }: AffirmationSettingsProps) {
  const [settings, setSettings] = useState<AffirmationSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await affirmationService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await affirmationService.updateSettings(settings);
      //Alvaros - Dailyaffirmations: TODO: Replace alerts with app-wide toast notifications for consistency
      alert('Settings saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof AffirmationSettingsType>(
    key: K,
    value: AffirmationSettingsType[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Alvaro-landmarks: Dialog element with proper ARIA attributes for modal */}
      <div
        role="dialog"
        aria-labelledby="affirmation-settings-title"
        aria-modal="true"
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/*Alvaros - Dailyaffirmations: Updated gradient to match app's rose/pink/orange theme*/}
        <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              {/* Alvaro-landmarks: Dialog heading with id for aria-labelledby */}
              {/*Alvaros - Dailyaffirmations: Clarified that these are notification delivery settings*/}
              <h2 id="affirmation-settings-title" className="text-2xl font-bold">
                Daily Affirmations
              </h2>
              <p className="text-rose-100 text-sm">
                Control when daily affirmations are delivered and how they’re personalized
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            {/*Alvaros - Dailyaffirmations: Updated spinner color to match theme*/}
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        ) : settings ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/*Alvaros - Dailyaffirmations: Clarified that this controls notification delivery*/}
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Enable Daily Affirmations</h3>
                  </div>
                  <button
                    onClick={() => updateSetting('enabled', !settings.enabled)}
                    className={`w-12 h-6 rounded-full relative transition-all ${
                      settings.enabled ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${
                        settings.enabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    ></div>
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {settings.enabled
                    ? 'Daily affirmations will be delivered at your scheduled times'
                    : "Daily affirmations are turned off. You won't receive any notifications"}
                </p>
              </div>

              {/* Phone notifications coming soon card */}
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Phone notifications (coming soon)
                    </h3>
                  </div>
                  <div className="w-12 h-6 rounded-full relative bg-gray-300 dark:bg-gray-600 pointer-events-none cursor-not-allowed">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow"></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  You'll soon be able to control whether Daily Affirmations are sent as push
                  notifications to your phone.
                </p>
              </div>

              {/*Alvaros - Dailyaffirmations: Changed to "Delivery schedule" with helper text, dims when disabled*/}
              <div
                className={`bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 ${
                  !settings.enabled ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delivery schedule</h3>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={settings.frequency === 'once_daily'}
                      onChange={() => updateSetting('frequency', 'once_daily')}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-gray-700 dark:text-gray-200">Once daily</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={settings.frequency === 'twice_daily'}
                      onChange={() => updateSetting('frequency', 'twice_daily')}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-gray-700 dark:text-gray-200">Twice daily</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Choose how many times per day you want to receive affirmations.
                </p>
              </div>

              {/*Alvaros - Dailyaffirmations: Clarified that times are in user's timezone, dims when disabled*/}
              <div
                className={`bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 ${
                  !settings.enabled ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delivery Times</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Times are based on your timezone
                  {settings.timezone ? `: ${settings.timezone}` : ''}.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Primary Time
                    </label>
                    <input
                      type="time"
                      value={settings.preferred_time?.slice(0, 5) || '08:00'}
                      onChange={(e) => updateSetting('preferred_time', `${e.target.value}:00`)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  {settings.frequency === 'twice_daily' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Secondary Time
                      </label>
                      <input
                        type="time"
                        value={settings.secondary_time?.slice(0, 5) || '20:00'}
                        onChange={(e) => updateSetting('secondary_time', `${e.target.value}:00`)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/*Alvaros - Dailyaffirmations: Clarified what data sources control and updated colors, dims when disabled*/}
              <div
                className={`bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 ${
                  !settings.enabled ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center space-x-2 mb-4">
                  <CheckSquare className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Personalization Sources</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Choose which data to use for generating personalized affirmations
                </p>

                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-550 transition-colors">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <span className="text-gray-700 dark:text-gray-200">Calendar Events</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.include_calendar ?? true}
                      onChange={(e) => updateSetting('include_calendar', e.target.checked)}
                      className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-550 transition-colors">
                    <div className="flex items-center space-x-3">
                      {/*Alvaros - Dailyaffirmations: Changed Tasks icon to rose-600 for consistency*/}
                      <CheckSquare className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <span className="text-gray-700 dark:text-gray-200">Tasks</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.include_tasks ?? true}
                      onChange={(e) => updateSetting('include_tasks', e.target.checked)}
                      className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-550 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      <span className="text-gray-700 dark:text-gray-200">Family Members</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.include_family ?? true}
                      onChange={(e) => updateSetting('include_family', e.target.checked)}
                      className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-550 transition-colors">
                    <div className="flex items-center space-x-3">
                      <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-gray-700 dark:text-gray-200">Shopping List</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.include_shopping ?? true}
                      onChange={(e) => updateSetting('include_shopping', e.target.checked)}
                      className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Failed to load settings</p>
          </div>
        )}

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            {/*Alvaros - Dailyaffirmations: Updated button gradient to match theme*/}
            <button
              onClick={handleSave}
              disabled={saving || !settings}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
