import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { Calendar, Heart, Droplet } from 'lucide-react-native';
import { Screen } from '../src/components/layout/Screen';
import { useTheme } from '../src/hooks/useTheme';
import { useAuth } from '../src/hooks/useAuth';
import { cycleTrackerService, CycleData, CycleSymptom } from '../src/services/cycleTrackerService';

export default function CycleTrackerScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [symptoms, setSymptoms] = useState<Record<string, CycleSymptom>>({});

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cycleData, symptomsData] = await Promise.all([
        cycleTrackerService.getCycleData(),
        cycleTrackerService.getSymptoms(),
      ]);

      if (cycleData) {
        setPeriodStart(new Date(cycleData.period_start_date));
        setCycleLength(cycleData.cycle_length);
        setPeriodLength(cycleData.period_length);
      }

      const symptomsMap: Record<string, CycleSymptom> = {};
      symptomsData.forEach(symptom => {
        symptomsMap[symptom.symptom_date] = symptom;
      });
      setSymptoms(symptomsMap);
    } catch (error) {
      console.error('Error loading cycle data:', error);
      Alert.alert('Error', 'Failed to load cycle data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePhase = (date: Date) => {
    if (!periodStart) return null;
    const daysSinceStart = Math.floor((date.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const dayInCycle = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;
    if (dayInCycle < periodLength) return { phase: 'period', cycleDay: dayInCycle + 1 };
    if (dayInCycle < 14) return { phase: 'follicular', cycleDay: dayInCycle + 1 };
    if (dayInCycle >= 12 && dayInCycle <= 16) return { phase: 'ovulation', cycleDay: dayInCycle + 1 };
    return { phase: 'luteal', cycleDay: dayInCycle + 1 };
  };

  const handlePeriodStart = async (dateString: string) => {
    try {
      const date = new Date(dateString);
      setPeriodStart(date);

      await cycleTrackerService.saveCycleData({
        period_start_date: date.toISOString().split('T')[0],
        cycle_length: cycleLength,
        period_length: periodLength,
      });

      await cycleTrackerService.addCycleHistory({
        period_start_date: date.toISOString().split('T')[0],
        cycle_length: cycleLength,
        period_length: periodLength,
      });

      Alert.alert('Success', 'Period start date saved');
    } catch (error) {
      console.error('Error saving period start:', error);
      Alert.alert('Error', 'Failed to save period start date');
    }
  };

  const nextPeriod = periodStart ? new Date(periodStart.getTime() + cycleLength * 24 * 60 * 60 * 1000) : null;
  const currentPhase = periodStart ? calculatePhase(new Date()) : null;

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Cycle Tracker',
            headerStyle: { backgroundColor: theme.colors.background.primary },
            headerTintColor: theme.colors.text.primary,
          }}
        />
        <Screen>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <Text className="mt-4" style={{ color: theme.colors.text.secondary }}>
              Loading cycle data...
            </Text>
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cycle Tracker',
          headerStyle: { backgroundColor: theme.colors.background.primary },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <Screen>
        <ScrollView className="flex-1 p-4" style={{ backgroundColor: theme.colors.background.primary }}>
          {/* Stats Cards */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <View className="flex-1 min-w-[45%] p-4 rounded-xl" style={{ backgroundColor: theme.colors.background.secondary }}>
              <View className="flex-row items-center mb-2">
                <View className="p-2 rounded-lg mr-2" style={{ backgroundColor: theme.colors.primary.light + '40' }}>
                  <Droplet size={20} color={theme.colors.primary.main} />
                </View>
                <Text className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Next Period
                </Text>
              </View>
              <Text className="text-xl font-bold" style={{ color: theme.colors.text.primary }}>
                {nextPeriod ? nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set date'}
              </Text>
            </View>

            <View className="flex-1 min-w-[45%] p-4 rounded-xl" style={{ backgroundColor: theme.colors.background.secondary }}>
              <View className="flex-row items-center mb-2">
                <View className="p-2 rounded-lg mr-2" style={{ backgroundColor: theme.colors.primary.light + '40' }}>
                  <Heart size={20} color={theme.colors.primary.main} />
                </View>
                <Text className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Cycle
                </Text>
              </View>
              <Text className="text-xl font-bold" style={{ color: theme.colors.text.primary }}>
                {cycleLength}d
              </Text>
            </View>

            <View className="flex-1 min-w-[45%] p-4 rounded-xl" style={{ backgroundColor: theme.colors.background.secondary }}>
              <View className="flex-row items-center mb-2">
                <View className="p-2 rounded-lg mr-2" style={{ backgroundColor: theme.colors.primary.light + '40' }}>
                  <Calendar size={20} color={theme.colors.primary.main} />
                </View>
                <Text className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Phase
                </Text>
              </View>
              <Text className="text-xl font-bold capitalize" style={{ color: theme.colors.text.primary }}>
                {currentPhase ? currentPhase.phase : 'N/A'}
              </Text>
            </View>

            <View className="flex-1 min-w-[45%] p-4 rounded-xl" style={{ backgroundColor: theme.colors.background.secondary }}>
              <View className="flex-row items-center mb-2">
                <View className="p-2 rounded-lg mr-2" style={{ backgroundColor: theme.colors.primary.light + '40' }}>
                  <Calendar size={20} color={theme.colors.primary.main} />
                </View>
                <Text className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Day
                </Text>
              </View>
              <Text className="text-xl font-bold" style={{ color: theme.colors.text.primary }}>
                {currentPhase ? currentPhase.cycleDay : '-'}
              </Text>
            </View>
          </View>

          {/* Settings */}
          <View className="p-6 rounded-xl mb-6" style={{ backgroundColor: theme.colors.background.secondary }}>
            <Text className="text-lg font-semibold mb-4" style={{ color: theme.colors.text.primary }}>
              Settings
            </Text>

            <View className="mb-4">
              <Text className="text-sm mb-2" style={{ color: theme.colors.text.secondary }}>
                Last Period Start
              </Text>
              <TextInput
                value={periodStart ? periodStart.toISOString().split('T')[0] : ''}
                onChangeText={handlePeriodStart}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.text.secondary}
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: theme.colors.background.input,
                  color: theme.colors.text.primary,
                  borderWidth: 1,
                  borderColor: theme.colors.border.default,
                }}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm mb-2" style={{ color: theme.colors.text.secondary }}>
                Cycle Length (days)
              </Text>
              <TextInput
                value={cycleLength.toString()}
                onChangeText={(text) => {
                  const val = parseInt(text) || 28;
                  setCycleLength(val);
                }}
                keyboardType="numeric"
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: theme.colors.background.input,
                  color: theme.colors.text.primary,
                  borderWidth: 1,
                  borderColor: theme.colors.border.default,
                }}
              />
            </View>

            <View>
              <Text className="text-sm mb-2" style={{ color: theme.colors.text.secondary }}>
                Period Length (days)
              </Text>
              <TextInput
                value={periodLength.toString()}
                onChangeText={(text) => {
                  const val = parseInt(text) || 5;
                  setPeriodLength(val);
                }}
                keyboardType="numeric"
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: theme.colors.background.input,
                  color: theme.colors.text.primary,
                  borderWidth: 1,
                  borderColor: theme.colors.border.default,
                }}
              />
            </View>
          </View>

          <Text className="text-sm text-center mb-4" style={{ color: theme.colors.text.secondary }}>
            Advanced features like symptom logging and AI insights coming soon!
          </Text>
        </ScrollView>
      </Screen>
    </>
  );
}
