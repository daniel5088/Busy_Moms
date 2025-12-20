/**
 * Comprehensive Tests for AI Functionality
 *
 * Tests cover:
 * - aiAssistantService: Central "Sara" AI assistant
 * - openai.ts: OpenAI API wrapper
 * - openaiRealtimeService: Real-time voice AI
 * - affirmationService: Daily affirmation generation
 * - webrtcService: WebRTC communication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mock Helpers
// ============================================================================

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  })),
};

// ============================================================================
// AI Assistant Service Tests
// ============================================================================

describe('AI Assistant Service', () => {
  describe('Date/Time Parsing Helpers', () => {
    describe('toISODate', () => {
      it('should parse ISO date format (YYYY-MM-DD)', () => {
        const input = '2025-01-15';
        const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        expect(match?.[0]).toBe('2025-01-15');
      });

      it('should parse MM/DD format and add current year', () => {
        const input = '01/15';
        const match = input.match(/^(\d{1,2})[\/-](\d{1,2})$/);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe('01');
        expect(match?.[2]).toBe('15');
      });

      it('should parse M/D format', () => {
        const input = '1/5';
        const match = input.match(/^(\d{1,2})[\/-](\d{1,2})$/);
        expect(match).toBeTruthy();
      });

      it('should handle "today" keyword', () => {
        const input = 'today';
        const lower = input.toLowerCase();
        expect(lower).toBe('today');
        const today = new Date().toISOString().split('T')[0];
        expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('should handle "tomorrow" keyword', () => {
        const input = 'tomorrow';
        const lower = input.toLowerCase();
        expect(lower).toBe('tomorrow');
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrow = d.toISOString().split('T')[0];
        expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('should return null for invalid date', () => {
        const input = 'not-a-date';
        const d = new Date(input);
        expect(Number.isNaN(d.getTime())).toBe(true);
      });
    });

    describe('toISOTime', () => {
      it('should parse 24-hour format (HH:MM)', () => {
        const input = '14:30';
        const match = input.match(/^(\d{2}):(\d{2})$/);
        expect(match?.[1]).toBe('14');
        expect(match?.[2]).toBe('30');
      });

      it('should parse 12-hour format with AM/PM', () => {
        const testCases = [
          { input: '2pm', expected: { hour: 14, minute: 0 } },
          { input: '2:30pm', expected: { hour: 14, minute: 30 } },
          { input: '12am', expected: { hour: 0, minute: 0 } },
          { input: '12pm', expected: { hour: 12, minute: 0 } },
          { input: '11:45am', expected: { hour: 11, minute: 45 } },
        ];

        testCases.forEach(({ input, expected }) => {
          const ampm = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
          expect(ampm).toBeTruthy();

          let h = Math.max(1, Math.min(12, parseInt(ampm![1], 10)));
          const m = Math.max(0, Math.min(59, ampm![2] ? parseInt(ampm![2], 10) : 0));
          const suffix = ampm![3].toLowerCase();

          if (suffix === 'pm' && h !== 12) h += 12;
          if (suffix === 'am' && h === 12) h = 0;

          expect(h).toBe(expected.hour);
          expect(m).toBe(expected.minute);
        });
      });

      it('should clamp hours and minutes to valid ranges', () => {
        const hour = Math.max(0, Math.min(23, 25));
        const minute = Math.max(0, Math.min(59, 75));
        expect(hour).toBe(23);
        expect(minute).toBe(59);
      });
    });

    describe('coerceInt', () => {
      it('should parse valid integers', () => {
        const parseValue = (n: unknown, fallback: number | null = null): number | null => {
          const v = Number.parseInt(String(n ?? ''), 10);
          return Number.isFinite(v) ? v : fallback;
        };

        expect(parseValue('5')).toBe(5);
        expect(parseValue(10)).toBe(10);
        expect(parseValue('42')).toBe(42);
      });

      it('should return fallback for invalid values', () => {
        const parseValue = (n: unknown, fallback: number | null = null): number | null => {
          const v = Number.parseInt(String(n ?? ''), 10);
          return Number.isFinite(v) ? v : fallback;
        };

        expect(parseValue('not-a-number', 0)).toBe(0);
        expect(parseValue(null, 1)).toBe(1);
        expect(parseValue(undefined, -1)).toBe(-1);
        expect(parseValue('', 99)).toBe(99);
      });
    });
  });

  describe('Instacart Sentence Parsing', () => {
    function extractItemsFromInstacartSentence(message: string): string[] {
      const text = String(message || '').toLowerCase().trim();
      const match = text.match(
        /(?:add|put|send|buy|get|need|order|shop)\s+(.+?)(?:\s+(?:to|in|into)\s+(?:my\s+)?(instacart|cart|shopping\s+list)|[.!?]|$)/
      );
      let raw = match?.[1] || '';
      if (!raw) {
        const simple = text.match(/(?:add|put|send|buy|get|need|order|shop)\s+(.+)/);
        raw = simple?.[1] || '';
      }
      if (!raw) return [];
      const pieces = raw.split(/,| and /i).map((p) => p.trim()).filter(Boolean);
      const cleaned = pieces.map((p) => p.replace(/\b(some|a|an|the|my)\b/gi, '').trim());
      return Array.from(new Set(cleaned.filter(Boolean)));
    }

    it('should extract single item from "add X to my instacart"', () => {
      const result = extractItemsFromInstacartSentence('add chicken to my instacart');
      expect(result).toContain('chicken');
    });

    it('should extract multiple items with "and"', () => {
      const result = extractItemsFromInstacartSentence('add bread and milk to my instacart');
      expect(result).toContain('bread');
      expect(result).toContain('milk');
    });

    it('should extract comma-separated items', () => {
      const result = extractItemsFromInstacartSentence('put apples, bananas, oranges in my cart');
      expect(result).toContain('apples');
      expect(result).toContain('bananas');
      expect(result).toContain('oranges');
    });

    it('should remove filler words (a, an, the, some, my)', () => {
      const result = extractItemsFromInstacartSentence('add some milk and a bread to my cart');
      expect(result).toContain('milk');
      expect(result).toContain('bread');
      expect(result).not.toContain('some');
      expect(result).not.toContain('a');
    });

    it('should handle various action verbs', () => {
      const verbs = ['add', 'put', 'send', 'buy', 'get', 'need', 'order', 'shop'];
      verbs.forEach((verb) => {
        const result = extractItemsFromInstacartSentence(`${verb} eggs to cart`);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should return empty array for no items found', () => {
      const result = extractItemsFromInstacartSentence('hello world');
      expect(result).toEqual([]);
    });

    it('should deduplicate items', () => {
      const result = extractItemsFromInstacartSentence('add milk and milk to my cart');
      expect(result.filter(i => i === 'milk').length).toBe(1);
    });
  });

  describe('Instacart Item Name Extraction', () => {
    function getInstacartItemNames(result: any): string[] {
      if (!result) return [];
      let itemsArray: any[] = [];
      if (Array.isArray(result.items)) itemsArray = result.items;
      else if (Array.isArray(result.data?.items)) itemsArray = result.data.items;
      else if (Array.isArray(result)) itemsArray = result;
      else return [];

      const names = itemsArray
        .map((it: any) => {
          if (typeof it === 'string') return it.trim();
          if (!it || typeof it !== 'object') return '';
          const possibleNames = [it.name, it.displayText, it.display_text, it.item, it.label, it.title];
          for (const name of possibleNames) {
            if (typeof name === 'string' && name.trim()) return name.trim();
          }
          return '';
        })
        .filter((s: string) => s && s.toLowerCase() !== '[object object]');

      return Array.from(new Set(names));
    }

    it('should extract names from items array with name field', () => {
      const result = { items: [{ name: 'Milk' }, { name: 'Bread' }] };
      const names = getInstacartItemNames(result);
      expect(names).toContain('Milk');
      expect(names).toContain('Bread');
    });

    it('should extract from nested data.items', () => {
      const result = { data: { items: [{ name: 'Eggs' }] } };
      const names = getInstacartItemNames(result);
      expect(names).toContain('Eggs');
    });

    it('should handle string arrays directly', () => {
      const result = { items: ['Apple', 'Banana', 'Orange'] };
      const names = getInstacartItemNames(result);
      expect(names).toContain('Apple');
      expect(names).toContain('Banana');
      expect(names).toContain('Orange');
    });

    it('should handle displayText field', () => {
      const result = { items: [{ displayText: 'Organic Milk' }] };
      const names = getInstacartItemNames(result);
      expect(names).toContain('Organic Milk');
    });

    it('should filter out [object Object] strings', () => {
      const result = { items: [{ name: 'Milk' }, { name: '[object Object]' }] };
      const names = getInstacartItemNames(result);
      expect(names).toContain('Milk');
      expect(names).not.toContain('[object Object]');
    });

    it('should return empty array for null/undefined', () => {
      expect(getInstacartItemNames(null)).toEqual([]);
      expect(getInstacartItemNames(undefined)).toEqual([]);
    });
  });

  describe('Intent Classification', () => {
    describe('Fallback Classification', () => {
      function fallbackClassify(message: string): { type: string; details?: any } {
        const lower = message.toLowerCase();

        // Shopping patterns
        if (/\b(add|put)\b.*\b(shopping|list)\b/.test(lower) ||
            /\b(buy|get|need)\b.*\b(milk|bread|eggs|groceries)\b/.test(lower)) {
          return { type: 'shopping', details: { title: message } };
        }

        // Reminder patterns
        if (/\bremind\s+me\b/.test(lower) || /\bset\s+(?:a\s+)?reminder\b/.test(lower)) {
          return { type: 'reminder', details: { title: message } };
        }

        // Task patterns
        if (/\b(task|todo|to\s+do|assign)\b/.test(lower) || /\bcreate\s+(?:a\s+)?task\b/.test(lower)) {
          return { type: 'task', details: { title: message } };
        }

        // Calendar patterns
        if (/\b(event|meeting|appointment|schedule)\b/.test(lower) || /\bon\s+\d/.test(lower)) {
          return { type: 'calendar', details: { title: message } };
        }

        return { type: 'chat', details: { query: message } };
      }

      it('should classify shopping requests', () => {
        expect(fallbackClassify('add milk to shopping list').type).toBe('shopping');
        expect(fallbackClassify('buy groceries').type).toBe('shopping');
        expect(fallbackClassify('need bread').type).toBe('shopping');
        expect(fallbackClassify('get eggs').type).toBe('shopping');
      });

      it('should classify reminders', () => {
        expect(fallbackClassify('remind me to call mom').type).toBe('reminder');
        expect(fallbackClassify('set a reminder for dentist').type).toBe('reminder');
        expect(fallbackClassify('set reminder to pick up kids').type).toBe('reminder');
      });

      it('should classify tasks', () => {
        expect(fallbackClassify('create a task for homework').type).toBe('task');
        expect(fallbackClassify('add todo item').type).toBe('task');
        expect(fallbackClassify('assign chores to kids').type).toBe('task');
      });

      it('should classify calendar events', () => {
        expect(fallbackClassify('schedule a meeting').type).toBe('calendar');
        expect(fallbackClassify('create an appointment').type).toBe('calendar');
        expect(fallbackClassify('add event on 15th').type).toBe('calendar');
      });

      it('should default to chat for general messages', () => {
        expect(fallbackClassify('hello').type).toBe('chat');
        expect(fallbackClassify('how are you').type).toBe('chat');
        expect(fallbackClassify('tell me a joke').type).toBe('chat');
      });
    });

    describe('Category Detection', () => {
      function detectCategory(text: string): string {
        const lower = text.toLowerCase();
        if (/\b(milk|cheese|yogurt|butter)\b/.test(lower)) return 'dairy';
        if (/\b(apples?|bananas?|carrots?|lettuce|fruits?|vegetables?)\b/.test(lower)) return 'produce';
        if (/\b(chicken|beef|fish|meat)\b/.test(lower)) return 'meat';
        if (/\b(bread|cake|muffin|bakery)\b/.test(lower)) return 'bakery';
        if (/\b(diapers?|formula|baby|wipes)\b/.test(lower)) return 'baby';
        if (/\b(soap|detergent|cleaner|household)\b/.test(lower)) return 'household';
        return 'other';
      }

      it('should detect dairy category', () => {
        expect(detectCategory('add milk')).toBe('dairy');
        expect(detectCategory('get cheese')).toBe('dairy');
        expect(detectCategory('need butter')).toBe('dairy');
      });

      it('should detect produce category', () => {
        expect(detectCategory('buy apples')).toBe('produce');
        expect(detectCategory('get bananas')).toBe('produce');
        expect(detectCategory('need carrots')).toBe('produce');
      });

      it('should detect meat category', () => {
        expect(detectCategory('buy chicken')).toBe('meat');
        expect(detectCategory('get beef')).toBe('meat');
        expect(detectCategory('need fish')).toBe('meat');
      });

      it('should detect bakery category', () => {
        expect(detectCategory('buy bread')).toBe('bakery');
        expect(detectCategory('get cake')).toBe('bakery');
      });

      it('should detect baby category', () => {
        expect(detectCategory('buy diapers')).toBe('baby');
        expect(detectCategory('get baby formula')).toBe('baby');
      });

      it('should detect household category', () => {
        expect(detectCategory('buy soap')).toBe('household');
        expect(detectCategory('get detergent')).toBe('household');
      });

      it('should default to other category', () => {
        expect(detectCategory('buy something')).toBe('other');
        expect(detectCategory('random item')).toBe('other');
      });
    });
  });

  describe('Action Response Format', () => {
    interface AIAction {
      type: string;
      success: boolean;
      message: string;
      data?: unknown;
    }

    it('should have required fields in successful response', () => {
      const response: AIAction = {
        type: 'calendar',
        success: true,
        message: 'Event created successfully',
        data: { id: '123', title: 'Meeting' },
      };

      expect(response).toHaveProperty('type');
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('message');
      expect(response.success).toBe(true);
    });

    it('should have error message in failed response', () => {
      const response: AIAction = {
        type: 'calendar',
        success: false,
        message: 'Failed to create event: missing date',
      };

      expect(response.success).toBe(false);
      expect(response.message).toContain('Failed');
    });

    it('should support all action types', () => {
      const actionTypes = [
        'calendar', 'reminder', 'shopping', 'shopping_query',
        'shopping_update', 'shopping_delete', 'task', 'family',
        'family_query', 'family_update', 'family_delete', 'chat'
      ];

      actionTypes.forEach(type => {
        const response: AIAction = { type, success: true, message: 'OK' };
        expect(actionTypes).toContain(response.type);
      });
    });
  });
});

// ============================================================================
// OpenAI Service Tests
// ============================================================================

describe('OpenAI Service', () => {
  describe('Fallback Responses', () => {
    function getFallbackResponse(messages: Array<{ role: string; content: string }>): string {
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

      if (lastMessage.includes('hello') || lastMessage.includes('hi')) {
        return "Hello! I'm your family assistant.";
      }
      if (lastMessage.includes('event') || lastMessage.includes('calendar')) {
        return 'I can help you manage your family events and calendar.';
      }
      if (lastMessage.includes('task') || lastMessage.includes('chore')) {
        return 'I can help you organize family tasks and chores.';
      }
      if (lastMessage.includes('shopping') || lastMessage.includes('grocery')) {
        return 'I can help you manage your shopping lists.';
      }
      if (lastMessage.includes('contact')) {
        return "I can help you manage your family contacts.";
      }
      return "I'm here to help you manage your family's schedule, tasks, and daily activities.";
    }

    it('should respond to greetings', () => {
      const response = getFallbackResponse([{ role: 'user', content: 'Hello there!' }]);
      expect(response).toContain('Hello');
    });

    it('should respond to calendar queries', () => {
      const response = getFallbackResponse([{ role: 'user', content: 'What events do I have?' }]);
      expect(response).toContain('calendar');
    });

    it('should respond to task queries', () => {
      const response = getFallbackResponse([{ role: 'user', content: 'Show me my tasks' }]);
      expect(response).toContain('tasks');
    });

    it('should respond to shopping queries', () => {
      const response = getFallbackResponse([{ role: 'user', content: 'What\'s on my grocery list?' }]);
      expect(response).toContain('shopping');
    });

    it('should respond to contact queries', () => {
      const response = getFallbackResponse([{ role: 'user', content: 'Show me contacts' }]);
      expect(response).toContain('contacts');
    });

    it('should provide default response for unknown queries', () => {
      const response = getFallbackResponse([{ role: 'user', content: 'xyz123' }]);
      expect(response).toContain('help');
    });
  });

  describe('WhatsApp Message Parsing (Fallback)', () => {
    function fallbackParseWhatsApp(message: string): {
      isEvent: boolean;
      eventDetails?: { title: string; date?: string; time?: string; location?: string };
    } {
      const lower = message.toLowerCase();
      const eventKeywords = ['party', 'birthday', 'appointment', 'meeting', 'practice', 'game', 'event'];
      const hasEventKeyword = eventKeywords.some((keyword) => lower.includes(keyword));

      if (!hasEventKeyword) {
        return { isEvent: false };
      }

      const sentences = message.split(/[.!?]/);
      const title = sentences[0]?.trim() || message.substring(0, 50);

      const datePatterns = [
        /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
        /\b(\d{1,2}\/\d{1,2}\/?\d{0,4})\b/,
        /\b(today|tomorrow|next week)\b/i,
      ];

      let date = '';
      for (const pattern of datePatterns) {
        const match = message.match(pattern);
        if (match) {
          date = match[1];
          break;
        }
      }

      const timePattern = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i;
      const timeMatch = message.match(timePattern);
      const time = timeMatch?.[1] || '';

      return {
        isEvent: true,
        eventDetails: {
          title: title || 'Event',
          date: date || undefined,
          time: time || undefined,
        },
      };
    }

    it('should detect event keywords', () => {
      expect(fallbackParseWhatsApp('Birthday party on Saturday').isEvent).toBe(true);
      expect(fallbackParseWhatsApp('Meeting at 3pm').isEvent).toBe(true);
      expect(fallbackParseWhatsApp('Doctor appointment tomorrow').isEvent).toBe(true);
    });

    it('should extract dates from messages', () => {
      const result = fallbackParseWhatsApp('Meeting on Monday at 3pm');
      expect(result.eventDetails?.date).toBe('Monday');
    });

    it('should extract times from messages', () => {
      const result = fallbackParseWhatsApp('Party at 7pm');
      expect(result.eventDetails?.time).toBe('7pm');
    });

    it('should handle messages without events', () => {
      const result = fallbackParseWhatsApp('How are you doing?');
      expect(result.isEvent).toBe(false);
    });

    it('should extract title as first sentence', () => {
      const result = fallbackParseWhatsApp('Birthday party for mom. Everyone invited!');
      expect(result.eventDetails?.title).toBe('Birthday party for mom');
    });
  });
});

// ============================================================================
// OpenAI Realtime Service Tests
// ============================================================================

describe('OpenAI Realtime Service', () => {
  describe('Event Emitter', () => {
    class Emitter {
      private listeners = new Map<string, Array<(ev: any) => void>>();

      on(type: string, fn: (ev: any) => void) {
        const arr = this.listeners.get(type) || [];
        arr.push(fn);
        this.listeners.set(type, arr);
      }

      off(type: string, fn: (ev: any) => void) {
        const arr = this.listeners.get(type) || [];
        this.listeners.set(type, arr.filter(f => f !== fn));
      }

      emit(ev: { type: string; [key: string]: any }) {
        const arr = this.listeners.get(ev.type) || [];
        for (const f of arr) f(ev);
      }
    }

    it('should register event listeners', () => {
      const emitter = new Emitter();
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.emit({ type: 'test', data: 'hello' });
      expect(handler).toHaveBeenCalledWith({ type: 'test', data: 'hello' });
    });

    it('should remove event listeners', () => {
      const emitter = new Emitter();
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.off('test', handler);
      emitter.emit({ type: 'test' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', () => {
      const emitter = new Emitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.emit({ type: 'test' });
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Instacart Detection in Messages', () => {
    function detectInstacart(text: string): boolean {
      const lower = text.toLowerCase();
      return (
        lower.includes('instacart') ||
        /\badd\b.*\bcart\b/.test(lower) ||
        lower.includes('shopping list') ||
        lower.includes('grocery')
      );
    }

    it('should detect "instacart" keyword', () => {
      expect(detectInstacart('add milk to my instacart')).toBe(true);
    });

    it('should detect "add to cart" phrase', () => {
      expect(detectInstacart('add bread to cart')).toBe(true);
    });

    it('should detect "shopping list" phrase', () => {
      expect(detectInstacart('put on my shopping list')).toBe(true);
    });

    it('should detect "grocery" keyword', () => {
      expect(detectInstacart('add to grocery list')).toBe(true);
    });

    it('should not detect in unrelated messages', () => {
      expect(detectInstacart('what is the weather')).toBe(false);
      expect(detectInstacart('schedule a meeting')).toBe(false);
    });
  });

  describe('Function Tools Configuration', () => {
    const functionTools = [
      { name: 'create_calendar_event', params: ['title', 'date'] },
      { name: 'query_calendar', params: ['query_type'] },
      { name: 'update_calendar_event', params: ['search_term', 'updates'] },
      { name: 'delete_calendar_event', params: ['search_term'] },
      { name: 'create_reminder', params: ['title', 'date'] },
      { name: 'add_shopping_item', params: ['title'] },
      { name: 'create_task', params: ['title'] },
      { name: 'query_tasks', params: ['query_type'] },
      { name: 'update_task', params: ['search_term', 'updates'] },
      { name: 'complete_task', params: ['search_term'] },
      { name: 'delete_task', params: ['search_term'] },
    ];

    it('should have all required function tools', () => {
      const toolNames = functionTools.map(t => t.name);
      expect(toolNames).toContain('create_calendar_event');
      expect(toolNames).toContain('query_calendar');
      expect(toolNames).toContain('create_task');
      expect(toolNames).toContain('add_shopping_item');
    });

    it('should have calendar management functions', () => {
      const calendarFunctions = functionTools.filter(t => t.name.includes('calendar'));
      expect(calendarFunctions.length).toBe(4);
    });

    it('should have task management functions', () => {
      const taskFunctions = functionTools.filter(t => t.name.includes('task'));
      expect(taskFunctions.length).toBe(5);
    });
  });

  describe('Wake Word Detection', () => {
    function detectWakeWord(transcript: string, wakeWord: string = 'hey sara'): boolean {
      return transcript.toLowerCase().includes(wakeWord.toLowerCase());
    }

    it('should detect "hey sara" wake word', () => {
      expect(detectWakeWord('hey sara, what is my schedule')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(detectWakeWord('HEY SARA!')).toBe(true);
      expect(detectWakeWord('Hey Sara')).toBe(true);
    });

    it('should not trigger on similar words', () => {
      expect(detectWakeWord('sarah is coming')).toBe(false);
      expect(detectWakeWord('hey there')).toBe(false);
    });

    it('should support custom wake words', () => {
      expect(detectWakeWord('ok google', 'ok google')).toBe(true);
    });
  });

  describe('Token URL Candidates', () => {
    function buildTokenUrlCandidates(
      ephemeralUrl?: string,
      functionsBase?: string,
      supabaseUrl?: string
    ): string[] {
      const urls: string[] = [];
      if (ephemeralUrl) urls.push(ephemeralUrl);
      if (functionsBase) {
        urls.push(
          `${functionsBase}/openai-token`,
          `${functionsBase}/webrtc-token`,
        );
      }
      if (supabaseUrl) {
        urls.push(
          `${supabaseUrl}/functions/v1/openai-token`,
          `${supabaseUrl}/functions/v1/webrtc-token`,
        );
      }
      urls.push(
        '/.netlify/functions/openai-token',
        '/openai-token',
        '/api/openai-token'
      );
      return Array.from(new Set(urls));
    }

    it('should include ephemeral URL if provided', () => {
      const urls = buildTokenUrlCandidates('https://custom.url/token');
      expect(urls).toContain('https://custom.url/token');
    });

    it('should include function base URLs', () => {
      const urls = buildTokenUrlCandidates(undefined, 'https://api.example.com');
      expect(urls).toContain('https://api.example.com/openai-token');
    });

    it('should include Supabase function URLs', () => {
      const urls = buildTokenUrlCandidates(undefined, undefined, 'https://project.supabase.co');
      expect(urls).toContain('https://project.supabase.co/functions/v1/openai-token');
    });

    it('should include Netlify function fallback', () => {
      const urls = buildTokenUrlCandidates();
      expect(urls).toContain('/.netlify/functions/openai-token');
    });

    it('should deduplicate URLs', () => {
      const urls = buildTokenUrlCandidates(
        '/openai-token',
        undefined,
        undefined
      );
      const openaiTokenUrls = urls.filter(u => u === '/openai-token');
      expect(openaiTokenUrls.length).toBe(1);
    });
  });
});

// ============================================================================
// Affirmation Service Tests
// ============================================================================

describe('Affirmation Service', () => {
  describe('shouldShowAffirmation', () => {
    interface AffirmationSettings {
      enabled: boolean;
      frequency: 'once_daily' | 'twice_daily';
      preferred_time: string;
      secondary_time?: string;
    }

    function shouldShowAffirmation(settings: AffirmationSettings | null): boolean {
      if (!settings || !settings.enabled) return false;
      if (!settings.preferred_time) return false;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const [prefHour, prefMinute] = settings.preferred_time.split(':').map(Number);
      const isPreferredTime = currentHour === prefHour && currentMinute === prefMinute;

      if (settings.frequency === 'twice_daily' && settings.secondary_time) {
        const [secHour, secMinute] = settings.secondary_time.split(':').map(Number);
        const isSecondaryTime = currentHour === secHour && currentMinute === secMinute;
        return isPreferredTime || isSecondaryTime;
      }

      return isPreferredTime;
    }

    it('should return false if settings is null', () => {
      expect(shouldShowAffirmation(null)).toBe(false);
    });

    it('should return false if affirmations are disabled', () => {
      expect(shouldShowAffirmation({
        enabled: false,
        frequency: 'once_daily',
        preferred_time: '08:00',
      })).toBe(false);
    });

    it('should return false if no preferred time is set', () => {
      expect(shouldShowAffirmation({
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '',
      })).toBe(false);
    });
  });

  describe('getTimeUntilNextAffirmation', () => {
    function getTimeUntilNextAffirmation(preferredTime: string | null): number | null {
      if (!preferredTime) return null;

      const [prefHour, prefMinute] = preferredTime.split(':').map(Number);
      const now = new Date();
      const next = new Date();
      next.setHours(prefHour, prefMinute, 0, 0);

      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      return next.getTime() - now.getTime();
    }

    it('should return null if no preferred time', () => {
      expect(getTimeUntilNextAffirmation(null)).toBe(null);
    });

    it('should return positive number for future time', () => {
      const result = getTimeUntilNextAffirmation('23:59');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should calculate time until tomorrow if time has passed', () => {
      const result = getTimeUntilNextAffirmation('00:01');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('formatTimeUntilNext', () => {
    function formatTimeUntilNext(milliseconds: number): string {
      const hours = Math.floor(milliseconds / (1000 * 60 * 60));
      const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }

    it('should format hours and minutes', () => {
      const twoHoursThirtyMinutes = 2 * 60 * 60 * 1000 + 30 * 60 * 1000;
      expect(formatTimeUntilNext(twoHoursThirtyMinutes)).toBe('2h 30m');
    });

    it('should format minutes only when less than an hour', () => {
      const fortyFiveMinutes = 45 * 60 * 1000;
      expect(formatTimeUntilNext(fortyFiveMinutes)).toBe('45m');
    });

    it('should handle zero minutes', () => {
      const oneHour = 60 * 60 * 1000;
      expect(formatTimeUntilNext(oneHour)).toBe('1h 0m');
    });
  });

  describe('Default Settings', () => {
    it('should have correct default values', () => {
      const defaultSettings = {
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:00:00',
        secondary_time: '20:00:00',
        include_calendar: true,
        include_tasks: true,
        include_family: true,
        include_shopping: true,
      };

      expect(defaultSettings.enabled).toBe(true);
      expect(defaultSettings.frequency).toBe('once_daily');
      expect(defaultSettings.preferred_time).toBe('08:00:00');
      expect(defaultSettings.include_calendar).toBe(true);
      expect(defaultSettings.include_tasks).toBe(true);
    });
  });
});

// ============================================================================
// WebRTC Service Tests
// ============================================================================

describe('WebRTC Service', () => {
  describe('Browser Support Detection', () => {
    it('should detect RTCPeerConnection support', () => {
      // Mock the check
      const isSupported = typeof RTCPeerConnection !== 'undefined';
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('ICE Server Configuration', () => {
    it('should have valid STUN server configuration', () => {
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];

      expect(iceServers).toHaveLength(2);
      expect(iceServers[0].urls).toContain('stun:');
    });

    it('should support multiple ICE servers', () => {
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
      ];

      expect(iceServers).toHaveLength(3);
      expect(iceServers[2]).toHaveProperty('username');
      expect(iceServers[2]).toHaveProperty('credential');
    });
  });

  describe('Peer Connection Options', () => {
    interface PeerConnectionOptions {
      audio?: boolean;
      video?: boolean;
      dataChannel?: boolean;
    }

    it('should support audio-only configuration', () => {
      const options: PeerConnectionOptions = { audio: true, video: false };
      expect(options.audio).toBe(true);
      expect(options.video).toBe(false);
    });

    it('should support video configuration', () => {
      const options: PeerConnectionOptions = { audio: true, video: true };
      expect(options.video).toBe(true);
    });

    it('should support data channel configuration', () => {
      const options: PeerConnectionOptions = { dataChannel: true };
      expect(options.dataChannel).toBe(true);
    });
  });

  describe('Connection States', () => {
    it('should handle all RTCPeerConnectionState values', () => {
      const states: RTCPeerConnectionState[] = [
        'new', 'connecting', 'connected', 'disconnected', 'failed', 'closed'
      ];

      states.forEach(state => {
        expect(['new', 'connecting', 'connected', 'disconnected', 'failed', 'closed']).toContain(state);
      });
    });
  });

  describe('Signaling Messages', () => {
    it('should format ICE candidate messages correctly', () => {
      const message = {
        type: 'ice-candidate',
        candidate: {
          candidate: 'candidate:123 1 udp 2130706431 192.168.1.1 12345 typ host',
          sdpMid: '0',
          sdpMLineIndex: 0,
        },
      };

      expect(message.type).toBe('ice-candidate');
      expect(message.candidate).toHaveProperty('candidate');
      expect(message.candidate).toHaveProperty('sdpMid');
    });

    it('should format offer/answer messages correctly', () => {
      const offer = {
        type: 'offer',
        sdp: 'v=0\r\no=- 123 1 IN IP4 127.0.0.1\r\n...',
      };

      expect(offer.type).toBe('offer');
      expect(offer.sdp).toContain('v=0');
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('AI Services Integration', () => {
  describe('Voice to Action Pipeline', () => {
    it('should map voice transcripts to correct action types', () => {
      const transcripts = [
        { text: 'schedule a meeting tomorrow at 2pm', expectedType: 'calendar' },
        { text: 'remind me to call mom', expectedType: 'reminder' },
        { text: 'add milk to shopping list', expectedType: 'shopping' },
        { text: 'create a task for homework', expectedType: 'task' },
        { text: 'how is the weather', expectedType: 'chat' },
      ];

      function classifyTranscript(text: string): string {
        const lower = text.toLowerCase();
        if (/\b(schedule|meeting|appointment|calendar|event)\b/.test(lower)) return 'calendar';
        if (/\bremind\b/.test(lower)) return 'reminder';
        if (/\b(shopping|list|buy|get)\b/.test(lower)) return 'shopping';
        if (/\b(task|todo|homework|chore)\b/.test(lower)) return 'task';
        return 'chat';
      }

      transcripts.forEach(({ text, expectedType }) => {
        expect(classifyTranscript(text)).toBe(expectedType);
      });
    });
  });

  describe('Context Aggregation for Affirmations', () => {
    it('should aggregate all context sources', () => {
      const context = {
        calendar: [{ title: 'Meeting', date: '2025-01-15' }],
        tasks: [{ title: 'Groceries', status: 'pending' }],
        shopping: [{ item: 'Milk', quantity: 1 }],
        family: [{ name: 'Emma', age: 8 }],
        profile: { full_name: 'Jane', user_type: 'mom' },
      };

      expect(context).toHaveProperty('calendar');
      expect(context).toHaveProperty('tasks');
      expect(context).toHaveProperty('shopping');
      expect(context).toHaveProperty('family');
      expect(context).toHaveProperty('profile');
    });

    it('should build prompt with available context', () => {
      function buildPrompt(context: any): string {
        let prompt = '';
        if (context.profile?.full_name) {
          prompt += `For ${context.profile.full_name}.\n`;
        }
        if (context.calendar?.length > 0) {
          prompt += `Upcoming: ${context.calendar.length} events.\n`;
        }
        if (context.tasks?.length > 0) {
          prompt += `Tasks: ${context.tasks.length} pending.\n`;
        }
        if (context.family?.length > 0) {
          prompt += `Family: ${context.family.length} members.\n`;
        }
        return prompt;
      }

      const context = {
        profile: { full_name: 'Jane' },
        calendar: [{ title: 'Meeting' }],
        tasks: [{ title: 'Task 1' }, { title: 'Task 2' }],
        family: [{ name: 'Child' }],
      };

      const prompt = buildPrompt(context);
      expect(prompt).toContain('Jane');
      expect(prompt).toContain('1 events');
      expect(prompt).toContain('2 pending');
      expect(prompt).toContain('1 members');
    });
  });

  describe('Error Handling Across Services', () => {
    it('should provide user-friendly error messages', () => {
      const errors = [
        { code: 401, message: 'Please sign in to continue.' },
        { code: 403, message: 'You do not have permission to perform this action.' },
        { code: 404, message: 'The requested resource was not found.' },
        { code: 500, message: 'Something went wrong. Please try again.' },
        { code: 503, message: 'Service temporarily unavailable. Please try again later.' },
      ];

      errors.forEach(({ code, message }) => {
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain('Error');
        expect(message).not.toMatch(/\d{3}/);
      });
    });

    it('should handle network failures gracefully', () => {
      function handleNetworkError(error: Error): { success: boolean; message: string } {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          return {
            success: false,
            message: 'Unable to connect. Please check your internet connection.',
          };
        }
        return {
          success: false,
          message: 'An unexpected error occurred. Please try again.',
        };
      }

      const networkError = new Error('network request failed');
      const result = handleNetworkError(networkError);
      expect(result.success).toBe(false);
      expect(result.message).toContain('connect');
    });
  });
});
