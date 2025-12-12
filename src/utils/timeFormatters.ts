/**
 * Shared time formatting utilities
 */

/**
 * Formats a time string to 12-hour format with AM/PM
 * @param timeString - Time string in HH:MM format
 * @returns Formatted time string (e.g., "2:30 PM") or "All day" if no time provided
 */
export function formatEventTime(timeString: string | null | undefined): string {
  if (!timeString) return 'All day';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
  } catch {
    return timeString;
  }
}

/**
 * Formats a time range for display
 * @param startTime - Start time string in HH:MM format
 * @param endTime - End time string in HH:MM format
 * @returns Formatted time range (e.g., "2:30 PM – 4:00 PM") or "All day"
 */
export function formatEventTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  if (!startTime) return 'All day';
  if (startTime && endTime) {
    return `${formatEventTime(startTime)} – ${formatEventTime(endTime)}`;
  }
  return formatEventTime(startTime);
}

/**
 * Formats a date string to a human-readable format
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
): string {
  return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Gets today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Gets a date N days from now in ISO format (YYYY-MM-DD)
 * @param days - Number of days to add
 */
export function getDateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}
