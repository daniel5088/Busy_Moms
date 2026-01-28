import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, UserCheck } from 'lucide-react';
import { supabase, Event, FamilyMember } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationManager } from '../../hooks/useNotificationManager';
import { LocationAutocomplete } from '../LocationAutocomplete';
import { geocodeLocation } from '../../services/geocoding';
import { getTravelTime } from '../../services/googleDirections';
import { useDefaultAddress } from '../../hooks/useDefaultAddress';
import { EmailRequiredPopup } from '../shared/EmailRequiredPopup';
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
  const { defaultAddress } = useDefaultAddress();
  const { scheduleEventNotification, cancelNotificationsByRelatedId } = useNotificationManager();
  const [loading, setLoading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [selectedMemberName, setSelectedMemberName] = useState('');
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
    assigned_to: '',
    visible_to_family: false,
  });

  // Load family members
  useEffect(() => {
    const loadFamilyMembers = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (data) setFamilyMembers(data);
    };
    loadFamilyMembers();
  }, [user]);

  // Update form data when defaultDate or event changes
  useEffect(() => {
    if (event) {
      const eventData = event as any;
      // When loading existing event, find the family member by email if assigned
      let assignedTo = '';
      if (eventData.assigned_to_email) {
        const member = familyMembers.find((m) => m.Email === eventData.assigned_to_email);
        assignedTo = member ? member.id : eventData.assigned_to_email;
      }
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
        assigned_to: assignedTo,
        visible_to_family: false,
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
        assigned_to: '',
        visible_to_family: false,
      });
    }
  }, [event, defaultDate, familyMembers]);

  const handleAssignmentChange = (value: string) => {
    if (value === 'family') {
      setFormData({ ...formData, assigned_to: 'family', visible_to_family: true });
    } else if (value) {
      const member = familyMembers.find((m) => m.id === value);
      if (member && !member.Email) {
        setSelectedMemberName(member.name);
        setShowEmailPopup(true);
        return;
      }
      // Store the member ID, we'll convert to email on submit
      setFormData({ ...formData, assigned_to: value, visible_to_family: false });
    } else {
      setFormData({ ...formData, assigned_to: '', visible_to_family: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Geocode location if provided
      let locationLat: number | null = null;
      let locationLng: number | null = null;
      let travelTimeMinutes: number | null = null;

      if (formData.location && formData.location.trim()) {
        const geocodeResult = await geocodeLocation(formData.location);
        if (geocodeResult) {
          locationLat = geocodeResult.lat;
          locationLng = geocodeResult.lng;

          // Calculate travel time from default address if available
          if (defaultAddress) {
            const defaultAddressString = [
              defaultAddress.street_address,
              defaultAddress.city,
              defaultAddress.state_province,
              defaultAddress.postal_code,
              defaultAddress.country,
            ]
              .filter(Boolean)
              .join(', ');

            // Create event start time for traffic-aware routing
            let eventStartTime: Date | undefined;
            if (formData.event_date && formData.start_time) {
              eventStartTime = new Date(`${formData.event_date}T${formData.start_time}`);
            }

            const travelTime = await getTravelTime(
              defaultAddressString,
              formData.location,
              'driving',
              eventStartTime
            );

            if (travelTime) {
              travelTimeMinutes = travelTime.durationMinutes;
            }
          }
        }
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        event_date: formData.event_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        location: formData.location,
        event_type: formData.event_type,
        participants: formData.participants
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p),
        source: 'manual' as const,
        location_lat: locationLat,
        location_lng: locationLng,
        travel_time_minutes: travelTimeMinutes,
        travel_time_updated_at: travelTimeMinutes ? new Date().toISOString() : null,
        rsvp_required: formData.rsvp_required,
        rsvp_status: formData.rsvp_status,
        // Map assigned_to to the new database columns
        // Convert family member ID to email
        assigned_to_email: formData.assigned_to && formData.assigned_to !== 'family' 
          ? familyMembers.find((m) => m.id === formData.assigned_to)?.Email || null
          : null,
        assigned_by_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        // Keep user_id as the creator of the event
        user_id: user.id,
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

      // Schedule notification for the event
      if (result.data && formData.event_date) {
        // Cancel any existing notifications for this event (in case of update)
        if (event) {
          await cancelNotificationsByRelatedId(event.id, 'events');
        }

        // Schedule new notification
        await scheduleEventNotification(
          result.data.id,
          formData.title,
          formData.event_date,
          formData.start_time
        );
      }

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

      {/* Location with Google Places autocomplete */}
      <FormField label="Location" icon={MapPin}>
        <LocationAutocomplete
          value={formData.location}
          onChange={(value: string) => setFormData((prev) => ({ ...prev, location: value }))}
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

      <FormField label="Visibility" icon={UserCheck}>
        <SelectInput
          value={formData.assigned_to}
          onChange={handleAssignmentChange}
          options={[
            { value: '', label: 'Just me' },
            { value: 'family', label: 'Family (everyone)' },
            ...familyMembers.map((member) => ({
              value: member.id,
              label: member.Email ? `${member.name} (assigned)` : `${member.name} (no email)`,
            })),
          ]}
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

      <EmailRequiredPopup
        isOpen={showEmailPopup}
        onClose={() => setShowEmailPopup(false)}
        memberName={selectedMemberName}
        itemType="event"
      />
    </form>
  );
}