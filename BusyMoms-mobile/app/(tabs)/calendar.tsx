import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react-native';
import { supabase, Event } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatEventTime, formatDate, getTodayISO, getDateInDays } from '../../utils/timeFormatters';

export default function CalendarScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id]);

  const loadEvents = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const today = getTodayISO();
      const futureDate = getDateInDays(30);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', today)
        .lte('event_date', futureDate)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const groupEventsByDate = () => {
    const grouped: { [key: string]: Event[] } = {};
    events.forEach((event) => {
      if (!grouped[event.event_date]) {
        grouped[event.event_date] = [];
      }
      const dateGroup = grouped[event.event_date];
      if (dateGroup) {
        dateGroup.push(event);
      }
    });
    return grouped;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const groupedEvents = groupEventsByDate();
  const dates = Object.keys(groupedEvents).sort();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {/* @ts-ignore */}<CalendarIcon width={24} height={24} stroke="#1F2937" />
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {dates.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarIcon size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No upcoming events</Text>
          </View>
        ) : (
          dates.map((date) => {
            const dateEvents = groupedEvents[date];
            if (!dateEvents) return null;
            return (
            <View key={date} style={styles.dateSection}>
              <Text style={styles.dateHeader}>{formatDate(date)}</Text>
              {dateEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                    <View style={styles.eventMeta}>
                      {/* @ts-ignore */}<Clock width={14} height={14} stroke="#6B7280" />
                      <Text style={styles.eventMetaText}>{formatEventTime(event)}</Text>
                    </View>
                    {event.location && (
                      <View style={styles.eventMeta}>
                        {/* @ts-ignore */}<MapPin width={14} height={14} stroke="#6B7280" />
                        <Text style={styles.eventMetaText}>{event.location}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
            );
          })
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  dateSection: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  eventContent: {
    gap: 6,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  eventDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  eventMetaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  bottomPadding: {
    height: 24,
  },
});
