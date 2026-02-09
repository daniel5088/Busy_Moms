/**
 * EventCard - Displays an event summary with time, location, and badges
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Clock, MapPin, Calendar } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Event } from '../../types/database';
import { formatEventTimeRange } from '../../utils/timeFormatters';
import { useRouter } from 'expo-router';

interface EventCardProps {
  event: Event;
  showDate?: boolean;
}

export function EventCard({ event, showDate = false }: EventCardProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    router.push(`/event/${event.id}`);
  };

  // Calculate if event is in next 7 days for weather
  const eventDate = new Date(event.event_date);
  const today = new Date();
  const daysUntilEvent = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const showWeather = daysUntilEvent >= 0 && daysUntilEvent <= 7;

  // Get event type badge color
  const getEventTypeColor = (type?: string | null) => {
    switch (type) {
      case 'appointment':
        return theme.colors.status.info;
      case 'birthday':
        return theme.colors.pastel.pink;
      case 'meeting':
        return theme.colors.status.warning;
      case 'reminder':
        return theme.colors.secondary.main;
      default:
        return theme.colors.gray[400];
    }
  };

  const eventTypeColor = getEventTypeColor(event.event_type);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.background.card,
          borderColor: theme.colors.border.default,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={handlePress}
    >
      {/* Event type indicator bar */}
      <View style={[styles.typeIndicator, { backgroundColor: eventTypeColor }]} />

      <View style={styles.content}>
        {/* Header with title and time */}
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: theme.colors.text.primary }]}
            numberOfLines={2}
          >
            {event.title}
          </Text>

          {event.event_type && (
            <View style={[styles.badge, { backgroundColor: `${eventTypeColor}20` }]}>
              <Text style={[styles.badgeText, { color: eventTypeColor }]}>
                {event.event_type}
              </Text>
            </View>
          )}
        </View>

        {/* Date/Time row */}
        <View style={styles.row}>
          <Clock size={14} color={theme.colors.text.secondary} />
          <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
            {showDate && `${event.event_date} • `}
            {formatEventTimeRange(event.start_time, event.end_time)}
          </Text>
        </View>

        {/* Location row */}
        {event.location && (
          <View style={styles.row}>
            <MapPin size={14} color={theme.colors.text.secondary} />
            <Text
              style={[styles.metaText, { color: theme.colors.text.secondary }]}
              numberOfLines={1}
            >
              {event.location}
            </Text>

            {/* Travel time indicator */}
            {event.travel_time_minutes && event.travel_time_minutes > 0 && (
              <Text style={[styles.travelTime, { color: theme.colors.primary.main }]}>
                • {event.travel_time_minutes} min
              </Text>
            )}
          </View>
        )}

        {/* Weather placeholder - will be populated in Task #8 */}
        {showWeather && (
          <View style={styles.row}>
            <Calendar size={14} color={theme.colors.text.tertiary} />
            <Text style={[styles.metaText, { color: theme.colors.text.tertiary }]}>
              Weather forecast available
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  typeIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    flex: 1,
  },
  travelTime: {
    fontSize: 12,
    fontWeight: '500',
  },
});
