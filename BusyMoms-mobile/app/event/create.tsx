/**
 * Event Create Screen - Create a new event
 */

import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { EventForm } from '../../src/components/calendar/EventForm';

export default function EventCreateScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();

  const handleSaved = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Screen>
      <Header title="Create Event" />
      <EventForm
        defaultDate={date}
        onCancel={handleCancel}
        onSaved={handleSaved}
      />
    </Screen>
  );
}
