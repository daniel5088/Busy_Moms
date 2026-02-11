import {
  formatTime,
  formatDate,
  formatDistanceToNow,
  formatEventTime,
  formatEventTimeRange,
  getTodayISO,
  getDateInDays,
} from '../../utils/timeFormatters';

describe('timeFormatters', () => {
  describe('formatTime', () => {
    it('should format time in 12-hour format with PM', () => {
      const result = formatTime('14:30');
      expect(result).toBe('2:30 PM');
    });

    it('should format time in 12-hour format with AM', () => {
      const result = formatTime('09:15');
      expect(result).toBe('9:15 AM');
    });

    it('should handle midnight', () => {
      const result = formatTime('00:00');
      expect(result).toBe('12:00 AM');
    });

    it('should handle noon', () => {
      const result = formatTime('12:00');
      expect(result).toBe('12:00 PM');
    });

    it('should handle null input', () => {
      const result = formatTime(null);
      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = formatTime(undefined);
      expect(result).toBe('');
    });

    it('should handle empty string', () => {
      const result = formatTime('');
      expect(result).toBe('');
    });

    it('should pad single-digit minutes', () => {
      const result = formatTime('14:05');
      expect(result).toBe('2:05 PM');
    });

    it('should handle 1 PM correctly', () => {
      const result = formatTime('13:00');
      expect(result).toBe('1:00 PM');
    });

    it('should handle 11 PM correctly', () => {
      const result = formatTime('23:59');
      expect(result).toBe('11:59 PM');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = formatDate('2024-06-15');
      expect(result).toContain('Jun');
      expect(result).toContain('15');
    });

    it('should include weekday abbreviation', () => {
      const result = formatDate('2024-01-01');
      expect(result.length).toBeGreaterThan(0);
      // Should contain day, month, and number
      expect(result).toMatch(/\w{3}.*\w{3}.*\d+/);
    });

    it('should handle different months', () => {
      const result = formatDate('2024-12-25');
      expect(result).toContain('Dec');
      expect(result).toContain('25');
    });
  });

  describe('formatEventTime', () => {
    it('should format event with start and end time', () => {
      const event = { start_time: '14:00', end_time: '16:00' };
      const result = formatEventTime(event);
      expect(result).toBe('2:00 PM - 4:00 PM');
    });

    it('should format event with only start time', () => {
      const event = { start_time: '10:30', end_time: null };
      const result = formatEventTime(event);
      expect(result).toBe('10:30 AM');
    });

    it('should return "All day" for event without start time', () => {
      const event = { start_time: null, end_time: null };
      const result = formatEventTime(event);
      expect(result).toBe('All day');
    });

    it('should handle undefined times', () => {
      const event = {};
      const result = formatEventTime(event);
      expect(result).toBe('All day');
    });
  });

  describe('formatEventTimeRange', () => {
    it('should format time range', () => {
      const result = formatEventTimeRange('09:00', '17:00');
      expect(result).toBe('9:00 AM - 5:00 PM');
    });

    it('should format single time', () => {
      const result = formatEventTimeRange('14:30', null);
      expect(result).toBe('2:30 PM');
    });

    it('should return "All day" for null start time', () => {
      const result = formatEventTimeRange(null, null);
      expect(result).toBe('All day');
    });

    it('should handle undefined end time', () => {
      const result = formatEventTimeRange('10:00');
      expect(result).toBe('10:00 AM');
    });
  });

  describe('formatDistanceToNow', () => {
    it('should return "just now" for very recent dates', () => {
      const date = new Date(Date.now() - 30 * 1000); // 30 seconds ago
      const result = formatDistanceToNow(date);
      expect(result).toBe('just now');
    });

    it('should return minutes for recent dates', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const result = formatDistanceToNow(date);
      expect(result).toMatch(/\d+ minutes?/);
    });

    it('should return hours for dates within a day', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const result = formatDistanceToNow(date);
      expect(result).toMatch(/\d+ hours?/);
    });

    it('should return days for older dates', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = formatDistanceToNow(date);
      expect(result).toMatch(/\d+ days?/);
    });

    it('should handle singular "minute"', () => {
      const date = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago
      const result = formatDistanceToNow(date);
      expect(result).toBe('1 minute');
    });

    it('should handle singular "hour"', () => {
      const date = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const result = formatDistanceToNow(date);
      expect(result).toBe('1 hour');
    });

    it('should handle singular "day"', () => {
      const date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const result = formatDistanceToNow(date);
      expect(result).toBe('1 day');
    });
  });

  describe('getTodayISO', () => {
    it('should return ISO date string', () => {
      const result = getTodayISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return today\'s date', () => {
      const result = getTodayISO();
      const today = new Date().toISOString().split('T')[0];
      expect(result).toBe(today);
    });
  });

  describe('getDateInDays', () => {
    it('should return date in future', () => {
      const result = getDateInDays(3);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return date in past', () => {
      const result = getDateInDays(-3);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle zero days (today)', () => {
      const result = getDateInDays(0);
      const today = getTodayISO();
      expect(result).toBe(today);
    });

    it('should handle large positive numbers', () => {
      const result = getDateInDays(365);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const year = parseInt(result.split('-')[0] || '', 10);
      const currentYear = new Date().getFullYear();
      expect(year).toBeGreaterThanOrEqual(currentYear);
    });

    it('should handle large negative numbers', () => {
      const result = getDateInDays(-365);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const year = parseInt(result.split('-')[0] || '', 10);
      const currentYear = new Date().getFullYear();
      expect(year).toBeLessThanOrEqual(currentYear);
    });
  });
});
