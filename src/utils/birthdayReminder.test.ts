import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBirthdayReminderMember } from './birthdayReminder';
import type { FamilyMember } from '../lib/supabase';

describe('getBirthdayReminderMember', () => {
  const createFamilyMember = (
    name: string,
    birthday: string,
    id: string = `id-${name}`
  ): FamilyMember => ({
    id,
    user_id: 'user-123',
    name,
    Email: `${name.toLowerCase()}@example.com`,
    birthday,
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when no family members are provided', () => {
    const result = getBirthdayReminderMember([]);
    expect(result).toBeNull();
  });

  it('returns null when no birthdays are exactly 14 days away', () => {
    vi.setSystemTime(new Date('2024-01-01'));
    const members = [
      createFamilyMember('Alice', '2010-01-10'),
      createFamilyMember('Bob', '2012-02-01'),
    ];
    const result = getBirthdayReminderMember(members);
    expect(result).toBeNull();
  });

  it('returns member whose birthday is exactly 14 days away', () => {
    vi.setSystemTime(new Date('2024-01-01'));
    const members = [
      createFamilyMember('Alice', '2010-01-15'),
      createFamilyMember('Bob', '2012-02-01'),
    ];
    const result = getBirthdayReminderMember(members);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Alice');
  });

  it('returns the first member when multiple have the same birthday 14 days away', () => {
    vi.setSystemTime(new Date('2024-01-01'));
    const members = [
      createFamilyMember('Bob', '2012-01-15'),
      createFamilyMember('Alice', '2010-01-15'),
    ];
    const result = getBirthdayReminderMember(members);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Bob');
  });

  it('handles members without birthdays', () => {
    vi.setSystemTime(new Date('2024-01-01'));
    const members = [
      { ...createFamilyMember('Alice', ''), birthday: null },
      createFamilyMember('Bob', '2012-01-15'),
    ];
    const result = getBirthdayReminderMember(members);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Bob');
  });

  it('handles invalid birthday formats gracefully', () => {
    vi.setSystemTime(new Date('2024-01-01'));
    const members = [
      createFamilyMember('Alice', 'invalid-date'),
      createFamilyMember('Bob', '2012-01-15'),
    ];
    const result = getBirthdayReminderMember(members);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Bob');
  });

  it('correctly calculates for birthdays that have already passed this year', () => {
    vi.setSystemTime(new Date('2024-12-01'));
    const members = [createFamilyMember('Alice', '2010-12-15')];
    const result = getBirthdayReminderMember(members);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Alice');
  });

  it('handles leap year birthdays', () => {
    vi.setSystemTime(new Date('2024-02-15'));
    const members = [createFamilyMember('Alice', '2000-02-29')];
    const result = getBirthdayReminderMember(members);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Alice');
  });
});
