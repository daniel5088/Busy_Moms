import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { supabase, Event } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { LocationAutocomplete } from '../LocationAutocomplete';
import {
  FormField,
  TextInput,
  TextArea,
  SelectInput,
  CheckboxInput,
  FormButtons,
  GridLayout,
} from '../shared/FormFields';

interface EventFormProps {
  defaultDate?: string;
  event?: Event;
  onCancel: () => void;
  onSaved: () => void;
}

export function EventForm({ defaultDate, event, onCancel, onSaved }: EventFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'other' as const,
    participants: '',
    rsvp_required: false,
    rsvp_status: 'pending' as const,
  });

  // public Google Maps key (set as VITE_GOOGLE_MAPS_API_KEY in env)
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // Update form data when defaultDate or event changes
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
      });
    } else if (defaultDate) {
      setFormData((prev) => ({
        ...prev,
        event_date: defaultDate,
      }));
    } else {
      // Reset form for new event
      setFormData({
        title: '',
        description: '',
        event_date: '',
        start_time: '',
        end_time: '',
        location: '',
        event_type: 'other',
        participants: '',
        rsvp_required: false,
        rsvp_status: 'pending',
      });
    }
  }, [event, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const eventData = {
        ...formData,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        user_id: user.id,
        participants: formData.participants
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p),
        source: 'manual' as const,
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

      onSaved();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <FormField label="Event Title" required>
        <TextInput
          value={formData.title}
          onChange={(value) => setFormData({ ...formData, title: value })}
          placeholder="Enter event title"
          required
        />
      </FormField>

      <FormField label="Description">
        <TextArea
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder="Event description"
        />
      </FormField>

      <GridLayout>
        <FormField label="Date" icon={Calendar} required>
          <TextInput
            type="date"
            value={formData.event_date}
            onChange={(value) => setFormData({ ...formData, event_date: value })}
            required
          />
        </FormField>
        <FormField label="Event Type">
          <SelectInput
            value={formData.event_type}
            onChange={(value) => setFormData({ ...formData, event_type: value as any })}
            options={[
              { value: 'sports', label: 'Sports' },
              { value: 'party', label: 'Party' },
              { value: 'meeting', label: 'Meeting' },
              { value: 'medical', label: 'Medical' },
              { value: 'school', label: 'School' },
              { value: 'family', label: 'Family' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </FormField>
      </GridLayout>

      <GridLayout>
        <FormField label="Start Time" icon={Clock}>
          <TextInput
            type="time"
            value={formData.start_time}
            onChange={(value) => setFormData({ ...formData, start_time: value })}
          />
        </FormField>
        <FormField label="End Time" icon={Clock}>
          <TextInput
            type="time"
            value={formData.end_time}
            onChange={(value) => setFormData({ ...formData, end_time: value })}
          />
        </FormField>
      </GridLayout>

      {/* Location with Google Places autocomplete (with fallback handled inside the component) */}
      <FormField label="Location" icon={MapPin}>
        <LocationAutocomplete
          value={formData.location}
          onChange={(value: string) => setFormData((prev) => ({ ...prev, location: value }))}
          apiKey={GOOGLE_MAPS_API_KEY}
          onSelect={(place: any) => {
            const name = place.name || place.description || '';
            setFormData((prev) => ({ ...prev, location: name || prev.location }));
          }}
        />
      </FormField>

      <FormField label="Participants" icon={Users}>
        <TextInput
          value={formData.participants}
          onChange={(value) => setFormData({ ...formData, participants: value })}
          placeholder="Emma, Tom (comma separated)"
        />
      </FormField>

      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <CheckboxInput
          checked={formData.rsvp_required}
          onChange={(checked) => setFormData({ ...formData, rsvp_required: checked })}
          label="RSVP Required"
        />

        {formData.rsvp_required && (
          <SelectInput
            value={formData.rsvp_status}
            onChange={(value) => setFormData({ ...formData, rsvp_status: value as any })}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
              { value: 'maybe', label: 'Maybe' },
            ]}
            className="px-2 py-1 sm:px-3 text-xs sm:text-sm"
          />
        )}
      </div>

      <FormButtons
        onCancel={onCancel}
        loading={loading}
        submitLabel={event ? 'Update Event' : 'Create Event'}
      />
    </form>
  );
}
