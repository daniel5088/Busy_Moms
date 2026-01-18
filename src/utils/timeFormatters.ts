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
  const [year, month, day] = dateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', options);
}

/**
 * Gets today's date in ISO format (YYYY-MM-DD) using local timezone
 */
export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets a date N days from now in ISO format (YYYY-MM-DD) using local timezone
 * @param days - Number of days to add
 */
export function getDateInDays(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string for display with relative context
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date with context (e.g., "Today, January 18", "Tomorrow, January 19", "Monday, January 20")
 */
export function formatDateForDisplay(dateString: string): string {
  const today = getTodayISO();
  const tomorrow = getDateInDays(1);

  if (dateString === today) {
    return `Today, ${formatDate(dateString, { month: 'long', day: 'numeric' })}`;
  } else if (dateString === tomorrow) {
    return `Tomorrow, ${formatDate(dateString, { month: 'long', day: 'numeric' })}`;
  } else {
    return formatDate(dateString, { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

/**
 * Alias for formatEventTime for consistency
 */
export function formatTimeForDisplay(timeString: string | null | undefined): string {
  return formatEventTime(timeString);
}

/**
 * Parses a time string to minutes since midnight for sorting
 * @param timeString - Time string in HH:MM format
 * @returns Minutes since midnight
 */
export function parseTimeToMinutes(timeString: string | null | undefined): number {
  if (!timeString) return 0;
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  } catch {
    return 0;
  }
}
