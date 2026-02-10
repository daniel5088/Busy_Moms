import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { Event } from '../../types/database';
import { formatEventTime } from '../../utils/timeFormatters';
import { useRouter } from 'expo-router';

interface TodaysScheduleProps {
  events: Event[];
  loading?: boolean;
}

export function TodaysSchedule({ events, loading }: TodaysScheduleProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Today's Schedule
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
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Today's Schedule
      </Text>

      {events.length === 0 ? (
        <Card>
          <EmptyState
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            icon={Calendar as any}
            title="No events today"
            description="Enjoy your free day!"
          />
        </Card>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card
              style={styles.eventCard}
              onPress={() => handleEventPress(item.id)}
            >
              <View style={styles.eventContent}>
                <View style={styles.timeContainer}>
                  <Text style={[styles.timeText, { color: theme.colors.primary.main }]}>
                    {formatEventTime(item)}
                  </Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text
                    style={[styles.eventTitle, { color: theme.colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {item.location && (
                    <View style={styles.locationContainer}>
                      <View style={styles.locationIcon}>
                        <MapPin
                          size={14}
                          color={theme.colors.text.tertiary}
                        />
                      </View>
                      <Text
                        style={[styles.locationText, { color: theme.colors.text.tertiary }]}
                        numberOfLines={1}
                      >
                        {item.location}
                      </Text>
                    </View>
                  )}
                </View>
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
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  eventContent: {
    flexDirection: 'row',
  },
  timeContainer: {
    marginRight: 12,
    minWidth: 70,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
