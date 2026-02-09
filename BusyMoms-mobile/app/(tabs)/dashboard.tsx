import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WeatherWidget } from '../../src/components/dashboard/WeatherWidget';
import { AffirmationBanner } from '../../src/components/dashboard/AffirmationBanner';
import { TodaysSchedule } from '../../src/components/dashboard/TodaysSchedule';
import { UpcomingEvents } from '../../src/components/dashboard/UpcomingEvents';
import { QuickActionsGrid } from '../../src/components/dashboard/QuickActionsGrid';
import { useDashboardData } from '../../src/hooks/useDashboardData';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { todayEvents, thisWeekEvents, loading, refetch } = useDashboardData();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mom';

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleAffirmationPress = () => {
    // TODO: Navigate to full affirmation modal (Phase 8)
    console.log('Affirmation pressed - full modal placeholder');
  };

  const handleCustomizeQuickActions = () => {
    // TODO: Navigate to quick actions customizer
    console.log('Customize quick actions pressed - placeholder');
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
        <AffirmationBanner onPress={handleAffirmationPress} />

        {/* Today's Schedule */}
        <TodaysSchedule events={todayEvents} loading={loading} />

        {/* Quick Actions Grid */}
        <QuickActionsGrid onCustomizePress={handleCustomizeQuickActions} />

        {/* This Week's Events */}
        <UpcomingEvents events={thisWeekEvents} loading={loading} />

        <View style={styles.bottomPadding} />
      </ScrollView>
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
