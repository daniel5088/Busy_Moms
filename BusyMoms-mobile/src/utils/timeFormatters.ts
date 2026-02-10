/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  const today = new Date();
  const isoString = today.toISOString().split('T')[0];
  return isoString || '';
}

/**
 * Get date in specified number of days from now
 */
export function getDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const isoString = date.toISOString().split('T')[0];
  return isoString || '';
}

/**
 * Format time from 24h format to 12h format
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '';

  const parts = time.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];

  if (hours === undefined || minutes === undefined) return '';

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format event time for display
 */
export function formatEventTime(event: { start_time?: string | null; end_time?: string | null }): string {
  if (!event.start_time) return 'All day';

  const startTime = formatTime(event.start_time);
  if (event.end_time) {
    const endTime = formatTime(event.end_time);
    return `${startTime} - ${endTime}`;
  }

  return startTime;
}

/**
 * Format event time range
 */
export function formatEventTimeRange(startTime?: string | null, endTime?: string | null): string {
  if (!startTime) return 'All day';

  const start = formatTime(startTime);
  if (endTime) {
    const end = formatTime(endTime);
    return `${start} - ${end}`;
  }

  return start;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format distance from now (e.g., "5 minutes", "2 hours", "3 days")
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
}
