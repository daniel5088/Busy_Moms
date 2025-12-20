// tests/affirmationService.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

// Mock data
const mockUser = { id: 'test-user-id' };
// Set expires_at to 1 hour from now to avoid triggering refresh
const mockSession = {
  access_token: 'test-access-token',
  user: mockUser,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

// ---- Mock Supabase client ----
// Note: These mocks are referenced by the factory function below
const mockFrom = vi.fn();
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      getUser: () => mockGetUser(),
      refreshSession: () => mockRefreshSession(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

import { AffirmationService } from '../src/services/affirmationService';

const originalFetch = global.fetch;

describe('AffirmationService', () => {
  let service: AffirmationService;

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn() as any;
    service = new AffirmationService();

    // Reset mocks
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
    });
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
    });
    mockRefreshSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('generateAffirmation', () => {
    it('should generate an affirmation successfully', async () => {
      const mockAffirmation = {
        id: 'affirmation-1',
        user_id: 'test-user-id',
        affirmation_text: 'You are doing great today!',
        generated_date: '2024-01-15',
        data_sources: { calendar: true, tasks: true },
        viewed: false,
        favorited: false,
      };

      const fetchMock = global.fetch as unknown as Mock;
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockAffirmation), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const result = await service.generateAffirmation();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/functions/v1/generate-affirmation');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer test-access-token');

      const body = JSON.parse(options.body);
      expect(body.forceRegenerate).toBe(false);
      expect(body.date).toBeDefined();

      expect(result).toEqual(mockAffirmation);
    });

    it('should pass forceRegenerate flag when set to true', async () => {
      const mockAffirmation = {
        id: 'affirmation-2',
        user_id: 'test-user-id',
        affirmation_text: 'A new affirmation for you!',
        generated_date: '2024-01-15',
      };

      const fetchMock = global.fetch as unknown as Mock;
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockAffirmation), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      await service.generateAffirmation(true);

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.forceRegenerate).toBe(true);
    });

    it('should throw error when user is not authenticated', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(service.generateAffirmation()).rejects.toThrow('User not authenticated');
    });

    it('should throw error when API returns an error', async () => {
      const fetchMock = global.fetch as unknown as Mock;
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Failed to generate' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      );

      await expect(service.generateAffirmation()).rejects.toThrow('Server error generating affirmation');
    });
  });

  describe('getTodaysAffirmation', () => {
    it('should return todays affirmation when it exists', async () => {
      const mockAffirmation = {
        id: 'affirmation-1',
        user_id: 'test-user-id',
        affirmation_text: 'Have a wonderful day!',
        generated_date: new Date().toISOString().split('T')[0],
      };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockAffirmation, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getTodaysAffirmation();

      expect(result).toEqual(mockAffirmation);
      expect(mockFrom).toHaveBeenCalledWith('affirmations');
    });

    it('should return null when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await service.getTodaysAffirmation();

      expect(result).toBeNull();
    });

    it('should return null when no affirmation exists for today', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getTodaysAffirmation();

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: new Error('Database error') }),
            }),
          }),
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await service.getTodaysAffirmation();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAffirmationHistory', () => {
    it('should return affirmation history with default limit', async () => {
      const mockHistory = [
        { id: 'affirmation-1', affirmation_text: 'Day 1 affirmation', generated_date: '2024-01-15' },
        { id: 'affirmation-2', affirmation_text: 'Day 2 affirmation', generated_date: '2024-01-14' },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockHistory, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getAffirmationHistory();

      expect(result).toEqual(mockHistory);
      expect(mockFrom).toHaveBeenCalledWith('affirmations');
    });

    it('should respect custom limit parameter', async () => {
      const mockLimitFn = vi.fn().mockResolvedValue({ data: [], error: null });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: mockLimitFn,
            }),
          }),
        }),
      });

      await service.getAffirmationHistory(10);

      expect(mockLimitFn).toHaveBeenCalledWith(10);
    });

    it('should return empty array when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await service.getAffirmationHistory();

      expect(result).toEqual([]);
    });

    it('should return empty array on database error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
            }),
          }),
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await service.getAffirmationHistory();

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('markAsViewed', () => {
    it('should mark affirmation as viewed', async () => {
      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockReturnValue({
        update: mockUpdateFn,
      });

      await service.markAsViewed('affirmation-123');

      expect(mockFrom).toHaveBeenCalledWith('affirmations');
      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          viewed: true,
          updated_at: expect.any(String),
        })
      );
    });

    it('should log error when update fails', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await service.markAsViewed('affirmation-123');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite to true', async () => {
      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockReturnValue({
        update: mockUpdateFn,
      });

      await service.toggleFavorite('affirmation-123', true);

      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          favorited: true,
          updated_at: expect.any(String),
        })
      );
    });

    it('should toggle favorite to false', async () => {
      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockReturnValue({
        update: mockUpdateFn,
      });

      await service.toggleFavorite('affirmation-123', false);

      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          favorited: false,
        })
      );
    });

    it('should throw error when update fails', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('Toggle failed') }),
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.toggleFavorite('affirmation-123', true)).rejects.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('getSettings', () => {
    it('should return user settings when they exist', async () => {
      const mockSettings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:00:00',
      };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
          }),
        }),
      });

      const result = await service.getSettings();

      expect(result).toEqual(mockSettings);
      expect(mockFrom).toHaveBeenCalledWith('affirmation_settings');
    });

    it('should return null when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await service.getSettings();

      expect(result).toBeNull();
    });

    it('should create default settings when none exist', async () => {
      const mockDefaultSettings = {
        id: 'settings-new',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:00:00',
      };

      // First call returns no settings
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      // Second call for insert (createDefaultSettings)
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockDefaultSettings, error: null }),
          }),
        }),
      });

      const result = await service.getSettings();

      expect(result).toEqual(mockDefaultSettings);
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const updatedSettings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: false,
        frequency: 'twice_daily',
        preferred_time: '09:00:00',
      };

      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedSettings, error: null }),
            }),
          }),
        }),
      });

      const result = await service.updateSettings({ enabled: false, frequency: 'twice_daily' });

      expect(result).toEqual(updatedSettings);
      expect(mockFrom).toHaveBeenCalledWith('affirmation_settings');
    });

    it('should return null when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await service.updateSettings({ enabled: false });

      expect(result).toBeNull();
    });

    it('should throw error when update fails', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
            }),
          }),
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.updateSettings({ enabled: false })).rejects.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('shouldShowAffirmation', () => {
    it('should return false when settings are null', () => {
      const result = service.shouldShowAffirmation(null);
      expect(result).toBe(false);
    });

    it('should return false when affirmations are disabled', () => {
      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: false,
        preferred_time: '08:00:00',
      };

      const result = service.shouldShowAffirmation(settings as any);
      expect(result).toBe(false);
    });

    it('should return false when preferred_time is not set', () => {
      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        preferred_time: null,
      };

      const result = service.shouldShowAffirmation(settings as any);
      expect(result).toBe(false);
    });

    it('should return true when current time matches preferred time', () => {
      // Set fake time to 08:30
      vi.setSystemTime(new Date('2024-01-15T08:30:00'));

      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:30:00',
      };

      const result = service.shouldShowAffirmation(settings as any);
      expect(result).toBe(true);
    });

    it('should return false when current time does not match preferred time', () => {
      // Set fake time to 09:00
      vi.setSystemTime(new Date('2024-01-15T09:00:00'));

      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:30:00',
      };

      const result = service.shouldShowAffirmation(settings as any);
      expect(result).toBe(false);
    });

    it('should check secondary time for twice_daily frequency', () => {
      // Set fake time to 20:00 (secondary time)
      vi.setSystemTime(new Date('2024-01-15T20:00:00'));

      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'twice_daily',
        preferred_time: '08:00:00',
        secondary_time: '20:00:00',
      };

      const result = service.shouldShowAffirmation(settings as any);
      expect(result).toBe(true);
    });

    it('should return false for twice_daily when neither time matches', () => {
      // Set fake time to 15:00
      vi.setSystemTime(new Date('2024-01-15T15:00:00'));

      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'twice_daily',
        preferred_time: '08:00:00',
        secondary_time: '20:00:00',
      };

      const result = service.shouldShowAffirmation(settings as any);
      expect(result).toBe(false);
    });
  });

  describe('getTimeUntilNextAffirmation', () => {
    it('should return null when settings are null', () => {
      const result = service.getTimeUntilNextAffirmation(null);
      expect(result).toBeNull();
    });

    it('should return null when affirmations are disabled', () => {
      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: false,
        preferred_time: '08:00:00',
      };

      const result = service.getTimeUntilNextAffirmation(settings as any);
      expect(result).toBeNull();
    });

    it('should return null when preferred_time is not set', () => {
      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        preferred_time: null,
      };

      const result = service.getTimeUntilNextAffirmation(settings as any);
      expect(result).toBeNull();
    });

    it('should calculate time until next affirmation when time is later today', () => {
      // Set current time to 06:00
      vi.setSystemTime(new Date('2024-01-15T06:00:00'));

      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        preferred_time: '08:00:00',
      };

      const result = service.getTimeUntilNextAffirmation(settings as any);

      // Should be approximately 2 hours (in milliseconds)
      expect(result).toBe(2 * 60 * 60 * 1000);
    });

    it('should calculate time until next day when preferred time has passed', () => {
      // Set current time to 10:00
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));

      const settings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        preferred_time: '08:00:00',
      };

      const result = service.getTimeUntilNextAffirmation(settings as any);

      // Should be approximately 22 hours (until 08:00 next day)
      expect(result).toBe(22 * 60 * 60 * 1000);
    });
  });

  describe('formatTimeUntilNext', () => {
    it('should format hours and minutes', () => {
      // 2 hours and 30 minutes in milliseconds
      const ms = 2 * 60 * 60 * 1000 + 30 * 60 * 1000;
      const result = service.formatTimeUntilNext(ms);
      expect(result).toBe('2h 30m');
    });

    it('should format minutes only when less than 1 hour', () => {
      // 45 minutes in milliseconds
      const ms = 45 * 60 * 1000;
      const result = service.formatTimeUntilNext(ms);
      expect(result).toBe('45m');
    });

    it('should handle zero minutes', () => {
      const ms = 0;
      const result = service.formatTimeUntilNext(ms);
      expect(result).toBe('0m');
    });

    it('should format exact hours correctly', () => {
      // Exactly 3 hours
      const ms = 3 * 60 * 60 * 1000;
      const result = service.formatTimeUntilNext(ms);
      expect(result).toBe('3h 0m');
    });
  });

  describe('checkAndShowAffirmation', () => {
    it('should return null when shouldShowAffirmation returns false', async () => {
      // Mock getSettings to return disabled settings
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'settings-1',
                user_id: 'test-user-id',
                enabled: false,
                preferred_time: '08:00:00',
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.checkAndShowAffirmation();
      expect(result).toBeNull();
    });

    it('should return existing affirmation when one exists and time matches', async () => {
      // Set time to match preferred time
      vi.setSystemTime(new Date('2024-01-15T08:00:00'));

      const mockAffirmation = {
        id: 'affirmation-1',
        user_id: 'test-user-id',
        affirmation_text: 'Great day!',
        generated_date: '2024-01-15',
        viewed: false,
      };

      const mockSettings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:00:00',
      };

      // First call for getSettings
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
          }),
        }),
      });

      // Second call for getTodaysAffirmation
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockAffirmation, error: null }),
            }),
          }),
        }),
      });

      // Third call for markAsViewed
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await service.checkAndShowAffirmation();

      expect(result).toEqual(mockAffirmation);
    });

    it('should not mark as viewed if affirmation was already viewed', async () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'));

      const mockAffirmation = {
        id: 'affirmation-1',
        user_id: 'test-user-id',
        affirmation_text: 'Great day!',
        generated_date: '2024-01-15',
        viewed: true, // Already viewed
      };

      const mockSettings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:00:00',
      };

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockAffirmation, error: null }),
            }),
          }),
        }),
      });

      const result = await service.checkAndShowAffirmation();

      expect(result).toEqual(mockAffirmation);
      // markAsViewed should not be called since viewed is already true
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  describe('createDefaultSettings', () => {
    it('should create default settings successfully', async () => {
      const mockDefaultSettings = {
        id: 'settings-new',
        user_id: 'test-user-id',
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:00:00',
        secondary_time: '20:00:00',
        include_calendar: true,
        include_tasks: true,
        include_family: true,
        include_shopping: true,
      };

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockDefaultSettings, error: null }),
          }),
        }),
      });

      const result = await service.createDefaultSettings();

      expect(result).toEqual(mockDefaultSettings);
      expect(mockFrom).toHaveBeenCalledWith('affirmation_settings');
    });

    it('should return null when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await service.createDefaultSettings();

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
          }),
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await service.createDefaultSettings();

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });
});
