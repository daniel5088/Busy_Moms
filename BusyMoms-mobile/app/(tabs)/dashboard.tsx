import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ShoppingBag, Clock, Heart } from 'lucide-react-native';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useAuth } from '../../hooks/useAuth';
import { formatEventTime, formatDate } from '../../utils/timeFormatters';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { todayEvents, thisWeekEvents, tasks, reminders, loading, reload } = useDashboardData();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mom';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {userName}!</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}</Text>
        </View>

        {/* Today's Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {/* @ts-ignore */}<Calendar width={20} height={20} stroke="#3B82F6" />
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
          </View>
          {todayEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No events scheduled for today</Text>
            </View>
          ) : (
            todayEvents.map((event) => (
              <Pressable key={event.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  {event.location && (
                    <Text style={styles.cardSubtitle}>{event.location}</Text>
                  )}
                  <View style={styles.cardMeta}>
                    {/* @ts-ignore */}<Clock width={14} height={14} stroke="#6B7280" />
                    <Text style={styles.cardMetaText}>{formatEventTime(event)}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* This Week's Events */}
        {thisWeekEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>This Week</Text>
            </View>
            {thisWeekEvents.slice(0, 5).map((event) => (
              <Pressable key={event.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  <Text style={styles.cardSubtitle}>{formatDate(event.event_date)}</Text>
                  {event.location && (
                    <Text style={styles.cardSubtitle}>{event.location}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Quick Shopping List */}
        {tasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              {/* @ts-ignore */}<ShoppingBag width={20} height={20} stroke="#10B981" />
              <Text style={styles.sectionTitle}>Shopping List</Text>
            </View>
            {tasks.slice(0, 5).map((task) => (
              <View key={task.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{task.item}</Text>
                  {task.quantity && task.unit && (
                    <Text style={styles.cardSubtitle}>
                      {task.quantity} {task.unit}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Reminders */}
        {reminders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              {/* @ts-ignore */}<Heart width={20} height={20} stroke="#EF4444" />
              <Text style={styles.sectionTitle}>Reminders</Text>
            </View>
            {reminders.slice(0, 5).map((reminder) => (
              <View key={reminder.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{reminder.title}</Text>
                  {reminder.reminder_date && (
                    <Text style={styles.cardSubtitle}>
                      {formatDate(reminder.reminder_date)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardContent: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardMetaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  bottomPadding: {
    height: 24,
  },
});
