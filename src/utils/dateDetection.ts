/**
 * Date Detection Utility
 * Parses natural language date/time expressions into Date objects
 */

export interface DetectedDate {
  date: Date;
  hasTime: boolean;
  confidence: 'high' | 'medium' | 'low';
  original: string;
}

export interface DateRange {
  start: DetectedDate;
  end?: DetectedDate;
}

export interface EventDateInfo {
  date: string; // YYYY-MM-DD format
  time?: string; // HH:MM:SS format
  hasTime: boolean;
  confidence: 'high' | 'medium' | 'low';
  relativeDescription: string; // "Today", "Tomorrow", "Monday", etc.
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Extract event date information from natural language text
 * This is the main function for parsing dates from user messages about events, reminders, and tasks
 */
export function extractEventDateInfo(text: string, referenceDate?: Date): EventDateInfo | null {
  const detected = detectDate(text, referenceDate);
  if (!detected) return null;
  
  const now = referenceDate || new Date();
  
  // Format date as YYYY-MM-DD
  const date = `${detected.date.getFullYear()}-${String(detected.date.getMonth() + 1).padStart(2, '0')}-${String(detected.date.getDate()).padStart(2, '0')}`;
  
  // Format time as HH:MM:SS if present
  let time: string | undefined;
  if (detected.hasTime) {
    time = `${String(detected.date.getHours()).padStart(2, '0')}:${String(detected.date.getMinutes()).padStart(2, '0')}:00`;
  }
  
  return {
    date,
    time,
    hasTime: detected.hasTime,
    confidence: detected.confidence,
    relativeDescription: getRelativeDateString(detected.date, now)
  };
}

/**
 * Detect and parse date/time from natural language text
 */
export function detectDate(text: string, referenceDate?: Date): DetectedDate | null {
  const now = referenceDate || new Date();
  const lowerText = text.toLowerCase().trim();
  
  // Try each detection method in order of specificity
  return (
    detectExplicitDate(lowerText, now) ||
    detectRelativeDate(lowerText, now) ||
    detectDayOfWeek(lowerText, now) ||
    detectTimeOnly(lowerText, now)
  );
}

/**
 * Detect explicit dates like "February 1st", "2/1/2026", "2026-02-01"
 */
function detectExplicitDate(text: string, now: Date): DetectedDate | null {
  // ISO format: 2026-02-01
  const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // US format: 2/1/2026 or 02/01/2026
  const usMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // US format without year: 2/1 or 02/01
  const usNoYearMatch = text.match(/(\d{1,2})\/(\d{1,2})(?!\d)/);
  if (usNoYearMatch) {
    const [, month, day] = usNoYearMatch;
    let year = now.getFullYear();
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    // If the date is in the past, assume next year
    if (date < now) {
      date.setFullYear(year + 1);
    }
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // Month name format: February 1st, Feb 1, February 1 2026
  const monthNameMatch = text.match(
    new RegExp(`(${MONTHS.join('|')}|${MONTHS_SHORT.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?`, 'i')
  );
  if (monthNameMatch) {
    const [, monthStr, day, year] = monthNameMatch;
    const monthIndex = MONTHS.indexOf(monthStr.toLowerCase()) !== -1 
      ? MONTHS.indexOf(monthStr.toLowerCase())
      : MONTHS_SHORT.indexOf(monthStr.toLowerCase());
    
    let dateYear = year ? parseInt(year) : now.getFullYear();
    const date = new Date(dateYear, monthIndex, parseInt(day));
    
    // If no year specified and date is in the past, use next year
    if (!year && date < now) {
      date.setFullYear(dateYear + 1);
    }
    
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // Day + month format: 1st of February, 1 February
  const dayMonthMatch = text.match(
    new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTHS.join('|')}|${MONTHS_SHORT.join('|')})(?:[,\\s]+(\\d{4}))?`, 'i')
  );
  if (dayMonthMatch) {
    const [, day, monthStr, year] = dayMonthMatch;
    const monthIndex = MONTHS.indexOf(monthStr.toLowerCase()) !== -1 
      ? MONTHS.indexOf(monthStr.toLowerCase())
      : MONTHS_SHORT.indexOf(monthStr.toLowerCase());
    
    let dateYear = year ? parseInt(year) : now.getFullYear();
    const date = new Date(dateYear, monthIndex, parseInt(day));
    
    if (!year && date < now) {
      date.setFullYear(dateYear + 1);
    }
    
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  return null;
}

/**
 * Detect relative dates like "today", "tomorrow", "in 3 days"
 */
function detectRelativeDate(text: string, now: Date): DetectedDate | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  // Today
  if (/\btoday\b/.test(text)) {
    const date = new Date(today);
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // Tonight
  if (/\btonight\b/.test(text)) {
    const date = new Date(today);
    date.setHours(20, 0, 0, 0); // Default to 8 PM
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: true,
      confidence: 'high',
      original: text
    };
  }

  // Tomorrow
  if (/\btomorrow\b/.test(text)) {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // Yesterday (for reference)
  if (/\byesterday\b/.test(text)) {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // Day after tomorrow
  if (/\b(day after tomorrow|overmorrow)\b/.test(text)) {
    const date = new Date(today);
    date.setDate(date.getDate() + 2);
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // In X days/weeks/months
  const inMatch = text.match(/\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/);
  if (inMatch) {
    const [, amount, unit] = inMatch;
    const date = new Date(today);
    const num = parseInt(amount);
    
    if (unit.startsWith('day')) {
      date.setDate(date.getDate() + num);
    } else if (unit.startsWith('week')) {
      date.setDate(date.getDate() + num * 7);
    } else if (unit.startsWith('month')) {
      date.setMonth(date.getMonth() + num);
    }
    
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // X days/weeks/months from now
  const fromNowMatch = text.match(/(\d+)\s+(day|days|week|weeks|month|months)\s+from\s+now/);
  if (fromNowMatch) {
    const [, amount, unit] = fromNowMatch;
    const date = new Date(today);
    const num = parseInt(amount);
    
    if (unit.startsWith('day')) {
      date.setDate(date.getDate() + num);
    } else if (unit.startsWith('week')) {
      date.setDate(date.getDate() + num * 7);
    } else if (unit.startsWith('month')) {
      date.setMonth(date.getMonth() + num);
    }
    
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // This weekend
  if (/\bthis\s+weekend\b/.test(text)) {
    const date = new Date(today);
    const dayOfWeek = date.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilSaturday);
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'medium',
      original: text
    };
  }

  // Next week
  if (/\bnext\s+week\b/.test(text) && !/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(text)) {
    const date = new Date(today);
    date.setDate(date.getDate() + 7);
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'medium',
      original: text
    };
  }

  // End of week/month
  if (/\bend\s+of\s+(the\s+)?week\b/.test(text)) {
    const date = new Date(today);
    const dayOfWeek = date.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilFriday);
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'medium',
      original: text
    };
  }

  if (/\bend\s+of\s+(the\s+)?month\b/.test(text)) {
    const date = new Date(today);
    date.setMonth(date.getMonth() + 1, 0); // Last day of current month
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'medium',
      original: text
    };
  }

  return null;
}

/**
 * Detect day of week references like "Monday", "next Tuesday", "this Friday"
 */
function detectDayOfWeek(text: string, now: Date): DetectedDate | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const currentDayOfWeek = today.getDay();

  // Next [day of week]
  const nextDayMatch = text.match(new RegExp(`\\bnext\\s+(${DAYS_OF_WEEK.join('|')}|${DAYS_SHORT.join('|')})\\b`, 'i'));
  if (nextDayMatch) {
    const [, dayStr] = nextDayMatch;
    const targetDay = DAYS_OF_WEEK.indexOf(dayStr.toLowerCase()) !== -1
      ? DAYS_OF_WEEK.indexOf(dayStr.toLowerCase())
      : DAYS_SHORT.indexOf(dayStr.toLowerCase());
    
    const date = new Date(today);
    let daysToAdd = (targetDay - currentDayOfWeek + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // If same day, go to next week
    daysToAdd += 7; // "next" means the week after this one
    date.setDate(date.getDate() + daysToAdd);
    
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // This [day of week]
  const thisDayMatch = text.match(new RegExp(`\\bthis\\s+(${DAYS_OF_WEEK.join('|')}|${DAYS_SHORT.join('|')})\\b`, 'i'));
  if (thisDayMatch) {
    const [, dayStr] = thisDayMatch;
    const targetDay = DAYS_OF_WEEK.indexOf(dayStr.toLowerCase()) !== -1
      ? DAYS_OF_WEEK.indexOf(dayStr.toLowerCase())
      : DAYS_SHORT.indexOf(dayStr.toLowerCase());
    
    const date = new Date(today);
    let daysToAdd = (targetDay - currentDayOfWeek + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 0; // "this" means today if same day
    date.setDate(date.getDate() + daysToAdd);
    
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'high',
      original: text
    };
  }

  // Just day of week (assume upcoming)
  const dayOnlyMatch = text.match(new RegExp(`\\b(${DAYS_OF_WEEK.join('|')}|${DAYS_SHORT.join('|')})\\b`, 'i'));
  if (dayOnlyMatch) {
    const [, dayStr] = dayOnlyMatch;
    const targetDay = DAYS_OF_WEEK.indexOf(dayStr.toLowerCase()) !== -1
      ? DAYS_OF_WEEK.indexOf(dayStr.toLowerCase())
      : DAYS_SHORT.indexOf(dayStr.toLowerCase());
    
    const date = new Date(today);
    let daysToAdd = (targetDay - currentDayOfWeek + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // If today, assume next week
    date.setDate(date.getDate() + daysToAdd);
    
    const timeResult = extractTime(text, date);
    return {
      date: timeResult.date,
      hasTime: timeResult.hasTime,
      confidence: 'medium',
      original: text
    };
  }

  return null;
}

/**
 * Detect time only (use current date)
 */
function detectTimeOnly(text: string, now: Date): DetectedDate | null {
  const timeResult = extractTime(text, new Date(now));
  if (timeResult.hasTime) {
    return {
      date: timeResult.date,
      hasTime: true,
      confidence: 'low',
      original: text
    };
  }
  return null;
}

/**
 * Extract time from text and apply to date
 */
function extractTime(text: string, baseDate: Date): { date: Date; hasTime: boolean } {
  const date = new Date(baseDate);
  
  // 12-hour format: 3pm, 3:30pm, 3:30 pm, 3 pm
  const time12Match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (time12Match) {
    let [, hours, minutes, period] = time12Match;
    let hour = parseInt(hours);
    const min = minutes ? parseInt(minutes) : 0;
    
    if (period.toLowerCase() === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period.toLowerCase() === 'am' && hour === 12) {
      hour = 0;
    }
    
    date.setHours(hour, min, 0, 0);
    return { date, hasTime: true };
  }

  // 24-hour format: 15:30, 15:00
  const time24Match = text.match(/\b(\d{1,2}):(\d{2})(?!\d)/);
  if (time24Match) {
    const [, hours, minutes] = time24Match;
    const hour = parseInt(hours);
    const min = parseInt(minutes);
    
    if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
      date.setHours(hour, min, 0, 0);
      return { date, hasTime: true };
    }
  }

  // Named times
  if (/\b(morning|in the morning)\b/.test(text)) {
    date.setHours(9, 0, 0, 0);
    return { date, hasTime: true };
  }
  if (/\b(afternoon|in the afternoon)\b/.test(text)) {
    date.setHours(14, 0, 0, 0);
    return { date, hasTime: true };
  }
  if (/\b(evening|in the evening)\b/.test(text)) {
    date.setHours(18, 0, 0, 0);
    return { date, hasTime: true };
  }
  if (/\b(night|at night)\b/.test(text)) {
    date.setHours(20, 0, 0, 0);
    return { date, hasTime: true };
  }
  if (/\b(noon|midday)\b/.test(text)) {
    date.setHours(12, 0, 0, 0);
    return { date, hasTime: true };
  }
  if (/\b(midnight)\b/.test(text)) {
    date.setHours(0, 0, 0, 0);
    return { date, hasTime: true };
  }

  return { date, hasTime: false };
}

/**
 * Detect date range from text (for events with start and end)
 */
export function detectDateRange(text: string, referenceDate?: Date): DateRange | null {
  const now = referenceDate || new Date();
  
  // "from X to Y" or "X to Y" or "X - Y"
  const rangeMatch = text.match(/(?:from\s+)?(.+?)\s+(?:to|until|-)\s+(.+)/i);
  if (rangeMatch) {
    const [, startText, endText] = rangeMatch;
    const start = detectDate(startText, now);
    const end = detectDate(endText, now);
    
    if (start) {
      return { start, end: end || undefined };
    }
  }
  
  // Single date
  const singleDate = detectDate(text, now);
  if (singleDate) {
    return { start: singleDate };
  }
  
  return null;
}

/**
 * Parse duration from text
 */
export function parseDuration(text: string): number | null {
  // Returns duration in minutes
  
  // X hours
  const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|h)\b/i);
  if (hoursMatch) {
    return parseFloat(hoursMatch[1]) * 60;
  }
  
  // X minutes
  const minutesMatch = text.match(/(\d+)\s*(?:minute|minutes|min|mins|m)\b/i);
  if (minutesMatch) {
    return parseInt(minutesMatch[1]);
  }
  
  // X hours and Y minutes
  const hoursMinutesMatch = text.match(/(\d+)\s*(?:hour|hours|hr|hrs|h)\s*(?:and\s*)?(\d+)\s*(?:minute|minutes|min|mins|m)?/i);
  if (hoursMinutesMatch) {
    return parseInt(hoursMinutesMatch[1]) * 60 + parseInt(hoursMinutesMatch[2]);
  }
  
  // Half hour
  if (/half\s*(?:an?\s*)?hour/i.test(text)) {
    return 30;
  }
  
  // Quarter hour
  if (/quarter\s*(?:of\s*an?\s*)?hour/i.test(text)) {
    return 15;
  }
  
  return null;
}

/**
 * Format a date for display
 */
export function formatDetectedDate(detected: DetectedDate): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  
  if (detected.hasTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  
  return detected.date.toLocaleString('en-US', options);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date, referenceDate?: Date): boolean {
  const now = referenceDate || new Date();
  return date.getFullYear() === now.getFullYear() &&
         date.getMonth() === now.getMonth() &&
         date.getDate() === now.getDate();
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(date: Date, referenceDate?: Date): boolean {
  const now = referenceDate || new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.getFullYear() === tomorrow.getFullYear() &&
         date.getMonth() === tomorrow.getMonth() &&
         date.getDate() === tomorrow.getDate();
}

/**
 * Get a human-readable relative date string
 */
export function getRelativeDateString(date: Date, referenceDate?: Date): string {
  const now = referenceDate || new Date();
  
  if (isToday(date, now)) {
    return 'Today';
  }
  if (isTomorrow(date, now)) {
    return 'Tomorrow';
  }
  
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0 && diffDays <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Parse a date query for finding events/reminders/tasks
 * Returns the target date in YYYY-MM-DD format
 */
export function parseDateQuery(query: string, referenceDate?: Date): string | null {
  const detected = detectDate(query, referenceDate);
  if (!detected) return null;
  
  const d = detected.date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a date string matches a query date
 */
export function dateMatchesQuery(eventDate: string, queryDate: string): boolean {
  // eventDate could be in various formats, normalize both
  const eventDateOnly = eventDate.split('T')[0];
  const queryDateOnly = queryDate.split('T')[0];
  return eventDateOnly === queryDateOnly;
}

/**
 * Extract all dates mentioned in text
 * Useful for finding multiple date references in a single message
 */
export function extractAllDates(text: string, referenceDate?: Date): DetectedDate[] {
  const results: DetectedDate[] = [];
  const now = referenceDate || new Date();
  
  // Split by common separators and try to detect dates in each part
  const parts = text.split(/[,;]|\band\b|\bto\b|\buntil\b/i);
  
  for (const part of parts) {
    const detected = detectDate(part.trim(), now);
    if (detected) {
      results.push(detected);
    }
  }
  
  // If no dates found from parts, try the whole text
  if (results.length === 0) {
    const detected = detectDate(text, now);
    if (detected) {
      results.push(detected);
    }
  }
  
  return results;
}

/**
 * Get the date range for a query like "this week", "next month", etc.
 */
export function getDateRangeFromQuery(query: string, referenceDate?: Date): { start: string; end: string } | null {
  const now = referenceDate || new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const formatDate = (d: Date) => 
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const lowerQuery = query.toLowerCase();
  
  // This week
  if (/\bthis\s+week\b/.test(lowerQuery)) {
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return { start: formatDate(startOfWeek), end: formatDate(endOfWeek) };
  }
  
  // Next week
  if (/\bnext\s+week\b/.test(lowerQuery)) {
    const dayOfWeek = today.getDay();
    const startOfNextWeek = new Date(today);
    startOfNextWeek.setDate(today.getDate() + (7 - dayOfWeek));
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    return { start: formatDate(startOfNextWeek), end: formatDate(endOfNextWeek) };
  }
  
  // This month
  if (/\bthis\s+month\b/.test(lowerQuery)) {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) };
  }
  
  // Next month
  if (/\bnext\s+month\b/.test(lowerQuery)) {
    const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { start: formatDate(startOfNextMonth), end: formatDate(endOfNextMonth) };
  }
  
  // Next X days
  const nextDaysMatch = lowerQuery.match(/\bnext\s+(\d+)\s+days?\b/);
  if (nextDaysMatch) {
    const days = parseInt(nextDaysMatch[1]);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);
    return { start: formatDate(today), end: formatDate(endDate) };
  }
  
  return null;
}

/**
 * Convert a time string to 24-hour format (HH:MM:SS)
 */
export function normalizeTime(timeStr: string): string | null {
  if (!timeStr) return null;
  
  const s = timeStr.trim();
  
  // Already in HH:MM:SS format
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) {
    return s;
  }
  
  // HH:MM format
  const time24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (time24) {
    const h = parseInt(time24[1]);
    const m = parseInt(time24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
  }
  
  // 12-hour format: 3pm, 3:30pm, etc.
  const time12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (time12) {
    let h = parseInt(time12[1]);
    const m = time12[2] ? parseInt(time12[2]) : 0;
    const period = time12[3].toLowerCase();
    
    if (period === 'pm' && h !== 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
  }
  
  return null;
}

/**
 * Format a time for display (12-hour format)
 */
export function formatTimeDisplay(time: string): string {
  if (!time) return '';
  
  const parts = time.split(':');
  if (parts.length < 2) return time;
  
  let h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const period = h >= 12 ? 'PM' : 'AM';
  
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  
  return m > 0 ? `${h}:${String(m).padStart(2, '0')} ${period}` : `${h} ${period}`;
}
