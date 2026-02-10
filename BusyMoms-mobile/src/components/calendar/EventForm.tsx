/**
 * EventForm - Form for creating and editing events
 * Mobile-optimized version with all core fields from web app
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Event } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FormField } from '../forms/FormField';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DateTimePicker } from '../forms/DateTimePicker';

interface EventFormProps {
  event?: Event;
  defaultDate?: string;
  onCancel: () => void;
  onSaved: () => void;
}

export function EventForm({ event, defaultDate, onCancel, onSaved }: EventFormProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: defaultDate || new Date().toISOString().split('T')[0] || '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'other',
    participants: '',
    rsvp_required: false,
    rsvp_status: 'pending' as 'pending' | 'yes' | 'no' | 'maybe',
    assigned_to: '',
  });


  // Load event data if editing
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_date: event.event_date || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        location: event.location || '',
        event_type: event.event_type || 'other',
        participants: event.participants?.join(', ') || '',
        rsvp_required: event.rsvp_required || false,
        rsvp_status: event.rsvp_status || 'pending',
        assigned_to: '',
      });
    }
  }, [event]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter an event title');
      return;
    }
    if (!formData.event_date) {
      Alert.alert('Validation Error', 'Please select a date');
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        event_date: formData.event_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        location: formData.location.trim() || null,
        event_type: formData.event_type,
        participants: formData.participants
          ? formData.participants.split(',').map((p) => p.trim()).filter((p) => p)
          : null,
        source: 'manual' as const,
        rsvp_required: formData.rsvp_required,
        rsvp_status: formData.rsvp_status,
        user_id: user.id,
        // Location geocoding and travel time will be added in Task #5
        location_lat: null,
        location_lng: null,
        travel_time_minutes: null,
        travel_time_updated_at: null,
        assigned_to_email: null,
        assigned_by_name: null,
      };

      let result;
      if (event) {
        result = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .select()
          .single();
      } else {
        result = await supabase.from('events').insert([eventData]).select().single();
      }

      if (result.error) throw result.error;

      Alert.alert('Success', event ? 'Event updated successfully' : 'Event created successfully');
      onSaved();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={styles.content}
    >
      <FormField label="Event Title *" error={undefined}>
        <Input
          value={formData.title}
          onChangeText={(value) => setFormData({ ...formData, title: value })}
          placeholder="Enter event title"
          editable={!loading}
        />
      </FormField>

      <FormField label="Description" error={undefined}>
        <Input
          value={formData.description}
          onChangeText={(value) => setFormData({ ...formData, description: value })}
          placeholder="Event description (optional)"
          multiline
          numberOfLines={3}
          editable={!loading}
        />
      </FormField>

      <FormField label="Date *" error={undefined}>
        <DateTimePicker
          mode="date"
          value={formData.event_date ? new Date(formData.event_date + 'T00:00:00') : new Date()}
          onChange={(date) => {
            if (date) {
              const isoDate = date.toISOString().split('T')[0];
              setFormData({ ...formData, event_date: isoDate || '' });
            }
          }}
        />
      </FormField>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <FormField label="Start Time" error={undefined}>
            <DateTimePicker
              mode="time"
              value={
                formData.start_time
                  ? new Date(`2000-01-01T${formData.start_time}`)
                  : new Date()
              }
              onChange={(date) => {
                if (date) {
                  const timeStr = date.toTimeString().split(' ')[0];
                  setFormData({ ...formData, start_time: timeStr || '' });
                }
              }}
            />
          </FormField>
        </View>

        <View style={styles.halfField}>
          <FormField label="End Time" error={undefined}>
            <DateTimePicker
              mode="time"
              value={
                formData.end_time ? new Date(`2000-01-01T${formData.end_time}`) : new Date()
              }
              onChange={(date) => {
                if (date) {
                  const timeStr = date.toTimeString().split(' ')[0];
                  setFormData({ ...formData, end_time: timeStr || '' });
                }
              }}
            />
          </FormField>
        </View>
      </View>

      <FormField label="Location" error={undefined}>
        <Input
          value={formData.location}
          onChangeText={(value) => setFormData({ ...formData, location: value })}
          placeholder="Event location (optional)"
          editable={!loading}
        />
      </FormField>

      {/* TODO: Add location autocomplete in Task #5 */}
      {/* TODO: Add event type picker */}
      {/* TODO: Add family member assignment */}
      {/* TODO: Add RSVP toggle */}

      <View style={styles.buttons}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onCancel}
          disabled={loading}
          style={styles.button}
        />
        <Button
          title={event ? 'Update Event' : 'Create Event'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
});
