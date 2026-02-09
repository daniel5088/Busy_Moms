/**
 * EventList - Displays a list of events using FlatList
 */

import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Event } from '../../types/database';
import { EventCard } from './EventCard';
import { EmptyState } from '../ui/EmptyState';

interface EventListProps {
  events: Event[];
  showDate?: boolean;
  emptyMessage?: string;
  loading?: boolean;
}

export function EventList({
  events,
  showDate = false,
  emptyMessage = 'No events for this day',
  loading = false,
}: EventListProps) {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: theme.colors.text.secondary }}>Loading events...</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EventCard event={item} showDate={showDate} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
});
