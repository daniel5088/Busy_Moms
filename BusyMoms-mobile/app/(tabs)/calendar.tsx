/**
 * Calendar Tab Screen - Main calendar with month view and events
 * Complete rewrite for Phase 5
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { CalendarView } from '../../src/components/calendar/CalendarView';
import { EventList } from '../../src/components/calendar/EventList';
import { useTheme } from '../../src/hooks/useTheme';
import { useEventsForMonth, useEventsForDate } from '../../src/hooks/useEvents';
import { getTodayISO } from '../../src/utils/timeFormatters';
import type { DateData } from 'react-native-calendars';

export default function CalendarScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const today = getTodayISO();

  const [selectedDate, setSelectedDate] = useState(today);

  // Parse current year and month from selected date
  const currentYear = parseInt(selectedDate.split('-')[0] || '2024', 10);
  const currentMonth = parseInt(selectedDate.split('-')[1] || '1', 10);

  // Fetch events for the current month (for calendar markers)
  const { data: monthEvents = [], isLoading: monthLoading, refetch: refetchMonth } = useEventsForMonth(
    currentYear,
    currentMonth
  );

  // Fetch events for the selected day
  const { data: dayEvents = [], isLoading: dayLoading, refetch: refetchDay } = useEventsForDate(selectedDate);

  const isRefreshing = monthLoading || dayLoading;

  // Create marked dates for calendar
  const markedDates = useMemo(() => {
    const marked: {
      [date: string]: {
        marked?: boolean;
        dotColor?: string;
        selected?: boolean;
        selectedColor?: string;
      };
    } = {};

    monthEvents.forEach((event) => {
      if (event.event_date) {
        marked[event.event_date] = {
          marked: true,
          dotColor: theme.colors.primary.main,
        };
      }
    });

    return marked;
  }, [monthEvents, theme.colors.primary.main]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchMonth(), refetchDay()]);
  };

  const handleCreateEvent = () => {
    router.push({
      pathname: '/event/create',
      params: { date: selectedDate },
    });
  };

  return (
    <Screen>
      <Header title="Calendar" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary.main}
          />
        }
      >
        {/* Calendar Month View */}
        <View style={styles.calendarSection}>
          <CalendarView
            selectedDate={selectedDate}
            onDayPress={handleDayPress}
            markedDates={markedDates}
          />
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateHeader}>
          <Text style={[styles.dateText, { color: theme.colors.text.primary }]}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {dayEvents.length > 0 && (
            <Text style={[styles.eventCount, { color: theme.colors.text.secondary }]}>
              {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
            </Text>
          )}
        </View>

        {/* Events for Selected Day */}
        <View style={styles.eventsSection}>
          <EventList
            events={dayEvents}
            loading={dayLoading}
            emptyMessage="No events for this day"
          />
        </View>

        {/* TODO: Google Calendar Connection Banner (will be added in Task #6) */}
        {/* TODO: Sync Status Indicator (will be added in Task #7) */}
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.colors.primary.main,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleCreateEvent}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 80, // Space for FAB
  },
  calendarSection: {
    padding: 16,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
  },
  eventCount: {
    fontSize: 14,
  },
  eventsSection: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
