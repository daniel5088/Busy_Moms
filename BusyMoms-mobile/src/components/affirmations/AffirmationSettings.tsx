import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
// @ts-ignore
import { Settings, X as XIcon, Clock, Bell } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { affirmationService } from '../../services/affirmationService';
import { logger } from '../../utils/logger';
import type { AffirmationSettings as AffirmationSettingsType } from '../../types/database';

interface AffirmationSettingsProps {
  visible: boolean;
  onClose: () => void;
  onSettingsChanged?: () => void;
}

type Frequency = 'once_daily' | 'twice_daily' | 'custom';

const FREQUENCY_OPTIONS: Array<{ value: Frequency; label: string; description: string }> = [
  { value: 'once_daily', label: 'Once Daily', description: 'One affirmation per day' },
  { value: 'twice_daily', label: 'Twice Daily', description: 'Morning and evening' },
];

const TIME_OPTIONS = [
  '06:00:00', '07:00:00', '08:00:00', '09:00:00', '10:00:00',
  '12:00:00', '14:00:00', '16:00:00', '18:00:00', '20:00:00', '21:00:00',
];

function formatTime(timeStr: string): string {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function AffirmationSettingsModal({
  visible,
  onClose,
  onSettingsChanged,
}: AffirmationSettingsProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AffirmationSettingsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await affirmationService.getSettings(user.id);
      setSettings(data);
    } catch (error: unknown) {
      logger.error('[AffirmationSettings] Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible, loadSettings]);

  const updateSetting = async (key: keyof AffirmationSettingsType, value: unknown) => {
    if (!user || !settings) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    setSaving(true);
    try {
      await affirmationService.updateSettings(user.id, { [key]: value });
      onSettingsChanged?.();
    } catch (error: unknown) {
      logger.error('[AffirmationSettings] Error updating setting:', error);
      // Revert on error
      setSettings(settings);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderToggleRow = (
    label: string,
    description: string,
    key: keyof AffirmationSettingsType,
    value: boolean
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.colors.border.light }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>{label}</Text>
        <Text style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => updateSetting(key, v)}
        trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary.light }}
        thumbColor={value ? theme.colors.primary.main : theme.colors.gray[400]}
      />
    </View>
  );

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background.primary }]}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.card, borderBottomColor: theme.colors.border.default }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Settings color={theme.colors.primary.main} size={20} />
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
                Affirmation Settings
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Close" style={styles.headerClose}>
              <XIcon color={theme.colors.text.secondary} size={20} />
            </Pressable>
          </View>
          {saving && (
            <View style={styles.savingBanner}>
              <ActivityIndicator size="small" color={theme.colors.primary.main} />
              <Text style={[styles.savingText, { color: theme.colors.primary.main }]}>Saving...</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {settings && (
            <>
              {/* Enable/Disable */}
              {renderToggleRow(
                'Enable Affirmations',
                'Receive daily personalized affirmations',
                'enabled',
                settings.enabled ?? true
              )}

              {settings.enabled && (
                <>
                  {/* Frequency */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Bell color={theme.colors.text.secondary} size={16} />
                      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                        Frequency
                      </Text>
                    </View>
                    <View style={styles.optionGroup}>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => updateSetting('frequency', option.value)}
                          style={[
                            styles.optionItem,
                            {
                              backgroundColor:
                                settings.frequency === option.value
                                  ? theme.colors.primary.main + '15'
                                  : theme.colors.background.card,
                              borderColor:
                                settings.frequency === option.value
                                  ? theme.colors.primary.main
                                  : theme.colors.border.default,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              {
                                color:
                                  settings.frequency === option.value
                                    ? theme.colors.primary.main
                                    : theme.colors.text.primary,
                              },
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text style={[styles.optionDesc, { color: theme.colors.text.secondary }]}>
                            {option.description}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Preferred Time */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Clock color={theme.colors.text.secondary} size={16} />
                      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                        Preferred Time
                      </Text>
                    </View>
                    <View style={styles.timeGrid}>
                      {TIME_OPTIONS.map((time) => (
                        <Pressable
                          key={time}
                          onPress={() => updateSetting('preferred_time', time)}
                          style={[
                            styles.timeChip,
                            {
                              backgroundColor:
                                settings.preferred_time === time
                                  ? theme.colors.primary.main
                                  : theme.colors.background.card,
                              borderColor:
                                settings.preferred_time === time
                                  ? theme.colors.primary.main
                                  : theme.colors.border.default,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              {
                                color:
                                  settings.preferred_time === time
                                    ? '#FFFFFF'
                                    : theme.colors.text.primary,
                              },
                            ]}
                          >
                            {formatTime(time)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Secondary Time (if twice daily) */}
                  {settings.frequency === 'twice_daily' && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Clock color={theme.colors.text.secondary} size={16} />
                        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                          Secondary Time
                        </Text>
                      </View>
                      <View style={styles.timeGrid}>
                        {TIME_OPTIONS.map((time) => (
                          <Pressable
                            key={`sec-${time}`}
                            onPress={() => updateSetting('secondary_time', time)}
                            style={[
                              styles.timeChip,
                              {
                                backgroundColor:
                                  settings.secondary_time === time
                                    ? theme.colors.primary.main
                                    : theme.colors.background.card,
                                borderColor:
                                  settings.secondary_time === time
                                    ? theme.colors.primary.main
                                    : theme.colors.border.default,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeChipText,
                                {
                                  color:
                                    settings.secondary_time === time
                                      ? '#FFFFFF'
                                      : theme.colors.text.primary,
                                },
                              ]}
                            >
                              {formatTime(time)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Context Sources */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, marginBottom: 8 }]}>
                      Include Context From
                    </Text>
                    {renderToggleRow('Calendar', 'Include your schedule in affirmations', 'include_calendar', settings.include_calendar ?? true)}
                    {renderToggleRow('Tasks', 'Include your tasks in affirmations', 'include_tasks', settings.include_tasks ?? true)}
                    {renderToggleRow('Family', 'Include family context in affirmations', 'include_family', settings.include_family ?? true)}
                    {renderToggleRow('Shopping', 'Include shopping context in affirmations', 'include_shopping', settings.include_shopping ?? true)}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerClose: {
    padding: 4,
  },
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  savingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 40,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionGroup: {
    gap: 8,
  },
  optionItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
