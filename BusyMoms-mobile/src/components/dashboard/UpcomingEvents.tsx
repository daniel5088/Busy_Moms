import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { Event } from '../../types/database';
import { formatDate } from '../../utils/timeFormatters';
import { useRouter } from 'expo-router';

interface UpcomingEventsProps {
  events: Event[];
  loading?: boolean;
}

export function UpcomingEvents({ events, loading }: UpcomingEventsProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const handleSeeAllPress = () => {
    router.push('/(tabs)/calendar');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          This Week
        </Text>
        <Card>
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading...
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          This Week
        </Text>
        {events.length > 0 && (
          <Pressable onPress={handleSeeAllPress} style={styles.seeAllButton}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary.main }]}>
              See All
            </Text>
            <ChevronRight size={16} color={theme.colors.primary.main} />
          </Pressable>
        )}
      </View>

      {events.length === 0 ? (
        <Card>
          <EmptyState
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            icon={Calendar as any}
            title="No upcoming events"
            description="Nothing planned for the rest of the week"
          />
        </Card>
      ) : (
        <FlatList
          data={events.slice(0, 5)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card
              style={styles.eventCard}
              onPress={() => handleEventPress(item.id)}
            >
              <View style={styles.eventContent}>
                <View style={styles.dateContainer}>
                  <View style={styles.calendarIcon}>
                    <Calendar
                      size={16}
                      color={theme.colors.text.tertiary}
                    />
                  </View>
                  <Text style={[styles.dateText, { color: theme.colors.text.secondary }]}>
                    {formatDate(item.event_date)}
                  </Text>
                </View>
                <Text
                  style={[styles.eventTitle, { color: theme.colors.text.primary }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </View>
            </Card>
          )}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 2,
  },
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  eventContent: {
    flexDirection: 'column',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  calendarIcon: {
    marginRight: 6,
  },
  dateText: {
    fontSize: 13,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
