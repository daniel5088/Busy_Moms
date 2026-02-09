/**
 * Event Detail Screen - View and edit a single event
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
// @ts-ignore - Edit icon not in type definitions
import { Calendar, Clock, MapPin, Trash2, Edit } from 'lucide-react-native';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { Button } from '../../src/components/ui/Button';
import { Modal } from '../../src/components/ui/Modal';
import { EventForm } from '../../src/components/calendar/EventForm';
import { useTheme } from '../../src/hooks/useTheme';
import { Event } from '../../src/types/database';
import { supabase } from '../../src/lib/supabase';
import { formatEventTimeRange, formatDate } from '../../src/utils/timeFormatters';

export default function EventDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase.from('events').delete().eq('id', id);
              if (error) throw error;
              Alert.alert('Success', 'Event deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEditSaved = () => {
    setIsEditModalOpen(false);
    loadEvent(); // Reload the event data
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Event Details" />
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.text.secondary }}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <Header title="Event Details" />
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.text.secondary }}>Event not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Event Details"
        rightAction={
          <View style={styles.headerButtons}>
            <Pressable onPress={() => setIsEditModalOpen(true)} style={styles.headerButton}>
              <Edit size={20} color={theme.colors.text.primary} />
            </Pressable>
            <Pressable onPress={handleDelete} style={styles.headerButton} disabled={deleting}>
              <Trash2 size={20} color={theme.colors.status.error} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Event Title */}
        <View style={styles.section}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            {event.title}
          </Text>
          {event.event_type && (
            <View style={[styles.badge, { backgroundColor: theme.colors.gray[200] }]}>
              <Text style={[styles.badgeText, { color: theme.colors.text.primary }]}>
                {event.event_type}
              </Text>
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.row}>
          <Calendar size={20} color={theme.colors.text.secondary} />
          <Text style={[styles.rowText, { color: theme.colors.text.primary }]}>
            {formatDate(event.event_date)}
          </Text>
        </View>

        {(event.start_time || event.end_time) && (
          <View style={styles.row}>
            <Clock size={20} color={theme.colors.text.secondary} />
            <Text style={[styles.rowText, { color: theme.colors.text.primary }]}>
              {formatEventTimeRange(event.start_time, event.end_time)}
            </Text>
          </View>
        )}

        {/* Location */}
        {event.location && (
          <View style={styles.row}>
            <MapPin size={20} color={theme.colors.text.secondary} />
            <Text style={[styles.rowText, { color: theme.colors.text.primary }]}>
              {event.location}
            </Text>
            {event.travel_time_minutes && event.travel_time_minutes > 0 && (
              <Text style={[styles.travelTime, { color: theme.colors.primary.main }]}>
                ({event.travel_time_minutes} min)
              </Text>
            )}
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View style={[styles.section, styles.descriptionSection]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
              Description
            </Text>
            <Text style={[styles.description, { color: theme.colors.text.primary }]}>
              {event.description}
            </Text>
          </View>
        )}

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
              Participants
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.text.primary }]}>
              {event.participants.join(', ')}
            </Text>
          </View>
        )}

        {/* RSVP Status */}
        {event.rsvp_required && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
              RSVP Status
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.text.primary }]}>
              {event.rsvp_status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Event"
      >
        <EventForm
          event={event}
          onCancel={() => setIsEditModalOpen(false)}
          onSaved={handleEditSaved}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  section: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  rowText: {
    fontSize: 16,
    flex: 1,
  },
  travelTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionSection: {
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
});
