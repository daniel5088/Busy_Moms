import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WeatherWidget } from '../../src/components/dashboard/WeatherWidget';
import { AffirmationBanner } from '../../src/components/dashboard/AffirmationBanner';
import { TodaysSchedule } from '../../src/components/dashboard/TodaysSchedule';
import { UpcomingEvents } from '../../src/components/dashboard/UpcomingEvents';
import { QuickActionsGrid } from '../../src/components/dashboard/QuickActionsGrid';
import { DailyAffirmation } from '../../src/components/affirmations/DailyAffirmation';
import { useDashboardData } from '../../src/hooks/useDashboardData';
import { useAffirmationNotifier } from '../../src/hooks/useAffirmationNotifier';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { logger } from '../../src/utils/logger';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { todayEvents, thisWeekEvents, loading, refetch } = useDashboardData();
  const { pendingAffirmation } = useAffirmationNotifier();
  const [showAffirmationModal, setShowAffirmationModal] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mom';

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleAffirmationPress = () => {
    setShowAffirmationModal(true);
  };

  const handleOpenVoiceChat = () => {
    setShowAffirmationModal(false);
    router.push('/voice-chat' as never);
  };

  const handleCustomizeQuickActions = () => {
    logger.debug('Customize quick actions pressed - placeholder');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.colors.primary.main}
            colors={[theme.colors.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.background.card,
              borderBottomColor: theme.colors.border.default,
            },
          ]}
        >
          <Text style={[styles.greeting, { color: theme.colors.text.primary }]}>
            Hello, {userName}!
          </Text>
          <Text style={[styles.date, { color: theme.colors.text.secondary }]}>
            {currentDate}
          </Text>
        </View>

        {/* Weather Widget */}
        <WeatherWidget />

        {/* Affirmation Banner */}
        <AffirmationBanner
          affirmation={pendingAffirmation?.affirmation_text}
          onPress={handleAffirmationPress}
        />

        {/* Today's Schedule */}
        <TodaysSchedule events={todayEvents} loading={loading} />

        {/* Quick Actions Grid */}
        <QuickActionsGrid onCustomizePress={handleCustomizeQuickActions} />

        {/* This Week's Events */}
        <UpcomingEvents events={thisWeekEvents} loading={loading} />

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Affirmation Modal */}
      <DailyAffirmation
        visible={showAffirmationModal}
        onClose={() => setShowAffirmationModal(false)}
        onOpenVoiceChat={handleOpenVoiceChat}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
  },
  bottomPadding: {
    height: 32,
  },
});
