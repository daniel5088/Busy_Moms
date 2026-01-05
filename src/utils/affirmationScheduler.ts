import { AffirmationSettings } from '../lib/supabase';

export interface ScheduledSlot {
  hour: number;
  minute: number;
  slotIndex: number;
}

export function getAutoShowKey(userId: string, date: string, slotIndex: number): string {
  return `affirmation_auto_shown_${userId}_${date}_slot${slotIndex}`;
}

export function hasBeenAutoShown(userId: string, date: string, slotIndex: number): boolean {
  const key = getAutoShowKey(userId, date, slotIndex);
  return localStorage.getItem(key) === 'true';
}

export function markAsAutoShown(userId: string, date: string, slotIndex: number): void {
  const key = getAutoShowKey(userId, date, slotIndex);
  localStorage.setItem(key, 'true');
}

export function clearOldAutoShowData(): void {
  const keysToRemove: string[] = [];
  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const cutoffDateStr = twoDaysAgo.toISOString().split('T')[0];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('affirmation_auto_shown_')) {
      const parts = key.split('_');
      if (parts.length >= 5) {
        const dateStr = parts[parts.length - 2];
        if (dateStr < cutoffDateStr) {
          keysToRemove.push(key);
        }
      }
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function getScheduledSlots(settings: AffirmationSettings | null): ScheduledSlot[] {
  if (!settings || !settings.enabled || !settings.preferred_time) {
    return [];
  }

  const slots: ScheduledSlot[] = [];

  const [prefHour, prefMinute] = settings.preferred_time.split(':').map(Number);
  if (!isNaN(prefHour) && !isNaN(prefMinute)) {
    slots.push({ hour: prefHour, minute: prefMinute, slotIndex: 0 });
  }

  if (settings.frequency === 'twice_daily' && settings.secondary_time) {
    const [secHour, secMinute] = settings.secondary_time.split(':').map(Number);
    if (!isNaN(secHour) && !isNaN(secMinute)) {
      slots.push({ hour: secHour, minute: secMinute, slotIndex: 1 });
    }
  }

  return slots;
}

export function findDueSlot(
  settings: AffirmationSettings | null,
  userId: string,
  currentDate: Date = new Date()
): ScheduledSlot | null {
  const slots = getScheduledSlots(settings);
  if (slots.length === 0) {
    return null;
  }

  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();
  const todayStr = currentDate.toISOString().split('T')[0];

  for (const slot of slots) {
    const isAfterSlotTime =
      currentHour > slot.hour || (currentHour === slot.hour && currentMinute >= slot.minute);

    if (isAfterSlotTime && !hasBeenAutoShown(userId, todayStr, slot.slotIndex)) {
      return slot;
    }
  }

  return null;
}
