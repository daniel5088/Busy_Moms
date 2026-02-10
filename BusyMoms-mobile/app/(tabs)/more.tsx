import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  User,
  Bell,
  Sync,
  MapPin,
  Cloud,
  Ruler,
  Volume2,
  Sparkles,
  Moon,
  LogOut,
  ChevronRight,
  Heart,
} from 'lucide-react-native';
import { Screen } from '../../src/components/layout/Screen';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/hooks/useAuth';

export default function MoreScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to sign out';
            Alert.alert('Error', message);
          }
        },
      },
    ]);
  };

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: Moon,
          label: 'Dark Mode',
          onPress: toggleTheme,
          showSwitch: true,
          switchValue: isDark,
        },
      ],
    },
    {
      title: 'Features',
      items: [
        {
          icon: Sparkles,
          label: 'Life Receipts',
          description: 'Capture and organize important moments',
          onPress: () => router.push('/life-receipts' as any),
        },
      ],
    },
    {
      title: 'Notifications & Wellness',
      items: [
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Manage notification preferences',
          onPress: () => router.push('/settings/notifications' as any),
        },
        {
          icon: Sparkles,
          label: 'Daily Affirmations',
          description: 'Personalized encouragement',
          onPress: () => {
            // Navigate to affirmation settings (linked from dashboard)
            router.push('/(tabs)/dashboard');
          },
        },
        {
          icon: Heart,
          label: 'Cycle Tracker',
          description: 'Track your wellness cycle',
          onPress: () => router.push('/cycle-tracker' as any),
        },
      ],
    },
    {
      title: 'Sync & Integration',
      items: [
        {
          icon: Sync,
          label: 'Calendar & Tasks Sync',
          description: 'Google Calendar and Tasks',
          onPress: () => {
            Alert.alert('Coming Soon', 'Sync settings will be available soon');
          },
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: MapPin,
          label: 'Saved Addresses',
          description: 'Manage locations',
          onPress: () => {
            Alert.alert('Coming Soon', 'Address management will be available soon');
          },
        },
        {
          icon: Cloud,
          label: 'Weather Settings',
          description: 'Temperature unit and location',
          onPress: () => {
            Alert.alert('Coming Soon', 'Weather settings will be available soon');
          },
        },
        {
          icon: Ruler,
          label: 'Measurement System',
          description: 'Metric or Imperial',
          onPress: () => {
            Alert.alert('Coming Soon', 'Measurement settings will be available soon');
          },
        },
        {
          icon: Volume2,
          label: 'Voice & AI Preferences',
          description: 'AI personality and voice',
          onPress: () => {
            Alert.alert('Coming Soon', 'Voice preferences will be available soon');
          },
        },
      ],
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: theme.colors.background.primary },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <Screen>
        <ScrollView className="flex-1" style={{ backgroundColor: theme.colors.background.primary }}>
          {/* Profile Header */}
          <View
            className="p-6 mb-4"
            style={{
              backgroundColor: theme.colors.primary.main,
            }}
          >
            <View className="flex-row items-center">
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <User size={32} color="#FFFFFF" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-bold text-white">{userName}</Text>
                <Text className="text-white opacity-90 mt-1">{userEmail}</Text>
              </View>
            </View>
          </View>

          {/* Settings Sections */}
          <View className="px-4">
            {settingsSections.map((section, sectionIndex) => (
              <View key={sectionIndex} className="mb-6">
                <Text
                  className="text-sm font-semibold mb-3 px-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  {section.title.toUpperCase()}
                </Text>
                <View
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: theme.colors.background.secondary }}
                >
                  {section.items.map((item, itemIndex) => (
                    <TouchableOpacity
                      key={itemIndex}
                      onPress={item.onPress}
                      className="flex-row items-center p-4"
                      style={{
                        borderBottomWidth: itemIndex < section.items.length - 1 ? 1 : 0,
                        borderBottomColor: '#E5E7EB',
                      }}
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: theme.colors.primary.light + '40' }}
                      >
                        <item.icon size={20} color={theme.colors.primary.main} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-medium text-base"
                          style={{ color: theme.colors.text.primary }}
                        >
                          {item.label}
                        </Text>
                        {('description' in item) && item.description && (
                          <Text
                            className="text-sm mt-1"
                            style={{ color: theme.colors.text.secondary }}
                          >
                            {item.description}
                          </Text>
                        )}
                      </View>
                      {('showSwitch' in item) && item.showSwitch ? (
                        <Switch
                          value={item.switchValue}
                          onValueChange={item.onPress}
                          trackColor={{
                            false: '#E5E7EB',
                            true: theme.colors.primary.light,
                          }}
                          thumbColor={theme.colors.background.primary}
                        />
                      ) : (
                        <ChevronRight size={20} color={theme.colors.text.secondary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Sign Out Button */}
            <TouchableOpacity
              onPress={handleSignOut}
              className="flex-row items-center justify-center p-4 rounded-xl mb-8"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <LogOut size={20} color="#EF4444" />
              <Text
                className="ml-2 font-semibold text-base"
                style={{ color: '#EF4444' }}
              >
                Sign Out
              </Text>
            </TouchableOpacity>

            {/* Version Info */}
            <Text
              className="text-center text-sm mb-8"
              style={{ color: theme.colors.text.secondary }}
            >
              Version 1.0.0
            </Text>
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}
