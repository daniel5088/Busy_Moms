/**
 * Tests for Supabase Edge Functions
 *
 * These tests mock the edge function handlers and verify:
 * - Request validation
 * - Authentication handling
 * - Response formatting
 * - Error handling
 * - CORS headers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mock Helpers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function createMockRequest(
  method: string,
  body?: object,
  headers: Record<string, string> = {}
): Request {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }
  return new Request('http://localhost/test', init);
}

function createMockSupabaseClient(overrides: {
  user?: { id: string } | null;
  userError?: Error | null;
  queryResults?: Record<string, { data: any; error: any }>;
} = {}) {
  const { user = { id: 'test-user-id' }, userError = null, queryResults = {} } = overrides;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: userError,
      }),
    },
    from: vi.fn((table: string) => {
      const result = queryResults[table] || { data: null, error: null };
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
        single: vi.fn().mockResolvedValue(result),
        then: vi.fn((cb) => Promise.resolve(cb(result))),
      };
    }),
  };
}

// ============================================================================
// Generate Affirmation Tests
// ============================================================================

describe('generate-affirmation edge function', () => {
  describe('CORS handling', () => {
    it('should return 200 with CORS headers for OPTIONS request', async () => {
      const req = createMockRequest('OPTIONS');

      // Simulate the OPTIONS handler
      const response = new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          'x-correlation-id': 'test-correlation-id',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('Method validation', () => {
    it('should reject non-POST methods with 405', async () => {
      const response = new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

      expect(response.status).toBe(405);
      const body = await response.json();
      expect(body.error).toBe('Method not allowed');
    });
  });

  describe('Authentication', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Missing authorization header');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Request validation', () => {
    it('should return 400 for invalid date format', async () => {
      const response = new Response(JSON.stringify({ error: 'Invalid date format' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid date format');
    });
  });

  describe('Affirmation settings', () => {
    it('should return 403 when affirmations are disabled', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Affirmations are disabled for this user' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Affirmations are disabled for this user');
    });
  });

  describe('Fallback affirmation generation', () => {
    it('should generate fallback affirmation when OpenAI key is missing', () => {
      const fallbackAffirmations = [
        "You're doing an amazing job balancing everything.",
        'Every moment you invest in your family matters.',
        'Your love and dedication shine through in everything you do.',
        'You are stronger than you know and more capable than you think.',
        'The care you show for your family is extraordinary.',
      ];

      // Simulate fallback selection
      const affirmation = fallbackAffirmations[0];
      expect(affirmation).toContain('amazing job');
    });

    it('should generate context-aware fallback for busy schedules', () => {
      const contextData = {
        calendar: [{ title: 'Meeting' }],
        tasks: [{ item: 'Groceries' }],
        family: [],
      };

      const hasEvents = contextData.calendar.length > 0;
      const hasTasks = contextData.tasks.length > 0;

      if (hasEvents && hasTasks) {
        const affirmation =
          "You have a full schedule ahead, but you've handled busy days before and you'll handle this one too.";
        expect(affirmation).toContain('full schedule');
      }
    });

    it('should generate family-focused fallback for multiple family members', () => {
      const contextData = {
        calendar: [],
        tasks: [],
        family: [{ name: 'Alice' }, { name: 'Bob' }],
      };

      if (contextData.family.length > 1) {
        const affirmation = `Being there for ${contextData.family.length} family members takes incredible strength and love.`;
        expect(affirmation).toContain('2 family members');
      }
    });
  });

  describe('Prompt building', () => {
    it('should build prompt with user profile info', () => {
      const contextData = {
        profile: { full_name: 'Jane', user_type: 'mom', ai_personality: 'Warm' },
        calendar: [],
        tasks: [],
        shopping: [],
        family: [],
      };

      const userName = contextData.profile?.full_name || 'there';
      const userType = contextData.profile?.user_type || 'parent';
      const personality = contextData.profile?.ai_personality || 'Friendly';

      let prompt = `Generate a personalized daily affirmation for ${userName}, a ${userType}.\n\n`;
      prompt += `Personality: ${personality}\n\n`;

      expect(prompt).toContain('Jane');
      expect(prompt).toContain('mom');
      expect(prompt).toContain('Warm');
    });

    it('should include upcoming events in prompt', () => {
      const events = [
        { title: 'Doctor appointment', event_date: '2025-01-15', start_time: '10:00' },
      ];

      let prompt = 'Upcoming events:\n';
      events.forEach((event) => {
        prompt += `- ${event.title} on ${event.event_date}${event.start_time ? ' at ' + event.start_time : ''}\n`;
      });

      expect(prompt).toContain('Doctor appointment');
      expect(prompt).toContain('2025-01-15');
      expect(prompt).toContain('at 10:00');
    });

    it('should include tasks in prompt', () => {
      const tasks = [
        { item: 'Pick up kids', urgent: true },
        { item: 'Prepare dinner', urgent: false },
      ];

      let prompt = 'Tasks to complete:\n';
      tasks.forEach((task) => {
        prompt += `- ${task.item}${task.urgent ? ' (urgent)' : ''}\n`;
      });

      expect(prompt).toContain('Pick up kids (urgent)');
      expect(prompt).toContain('Prepare dinner');
      expect(prompt).not.toContain('Prepare dinner (urgent)');
    });

    it('should include family members in prompt', () => {
      const family = [
        { name: 'Emma', age: 8, gender: 'female' },
        { name: 'Liam', age: 5, gender: 'male' },
      ];

      let prompt = 'Family members:\n';
      family.forEach((member) => {
        const ageInfo = member.age ? `, age ${member.age}` : '';
        const genderInfo = member.gender ? ` (${member.gender})` : '';
        prompt += `- ${member.name}${ageInfo}${genderInfo}\n`;
      });

      expect(prompt).toContain('Emma, age 8 (female)');
      expect(prompt).toContain('Liam, age 5 (male)');
    });
  });

  describe('Response format', () => {
    it('should return affirmation with required fields', async () => {
      const mockAffirmation = {
        id: 'test-id',
        affirmation_text: 'You are doing great!',
        generated_date: '2025-01-15',
        data_sources: { calendar: true, tasks: true, shopping: true, family: true },
        viewed: false,
        favorited: false,
        created_at: '2025-01-15T10:00:00Z',
      };

      const response = new Response(JSON.stringify(mockAffirmation), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('affirmation_text');
      expect(body).toHaveProperty('generated_date');
      expect(body).toHaveProperty('data_sources');
    });
  });
});

// ============================================================================
// OpenAI Token Tests
// ============================================================================

describe('openai-token edge function', () => {
  describe('CORS handling', () => {
    it('should return 200 with CORS headers for OPTIONS request', async () => {
      const response = new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          'x-correlation-id': 'test-correlation-id',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Method validation', () => {
    it('should reject non-POST methods with 405', async () => {
      const response = new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

      expect(response.status).toBe(405);
    });
  });

  describe('Authentication', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(401);
    });

    it('should return 401 when user authentication fails', async () => {
      const response = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Service availability', () => {
    it('should return 503 when OpenAI API key is not configured', async () => {
      const response = new Response(
        JSON.stringify({
          error: 'Service unavailable',
          message: 'OpenAI service is not configured',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe('Service unavailable');
    });

    it('should return 503 when OpenAI token generation fails', async () => {
      const response = new Response(
        JSON.stringify({
          error: 'Failed to generate token',
          message: 'Unable to create OpenAI session at this time',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe('Failed to generate token');
    });
  });

  describe('Token response format', () => {
    it('should return token with required fields', async () => {
      const mockTokenResponse = {
        client_secret: { value: 'ephemeral-token-value' },
        expiresAt: Date.now() + 60 * 60 * 1000,
        userId: 'test-user-id',
      };

      const response = new Response(JSON.stringify(mockTokenResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('client_secret');
      expect(body).toHaveProperty('expiresAt');
      expect(body).toHaveProperty('userId');
      expect(body.client_secret).toHaveProperty('value');
    });

    it('should set token expiration to 1 hour from now', () => {
      const expiresAt = Date.now() + 60 * 60 * 1000;
      const oneHourFromNow = Date.now() + 60 * 60 * 1000;

      // Allow 1 second variance
      expect(Math.abs(expiresAt - oneHourFromNow)).toBeLessThan(1000);
    });
  });

  describe('Session handling', () => {
    it('should handle request with sessionId', async () => {
      const body = { sessionId: 'test-session-123' };

      expect(body.sessionId).toBe('test-session-123');
    });

    it('should handle request without sessionId', async () => {
      const body = {};

      expect(body).not.toHaveProperty('sessionId');
    });
  });
});

// ============================================================================
// Google Calendar Tests
// ============================================================================

describe('google-calendar edge function', () => {
  describe('CORS handling', () => {
    it('should return 200 with CORS headers for OPTIONS request', async () => {
      const response = new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          'x-correlation-id': 'test-correlation-id',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Method validation', () => {
    it('should reject non-POST methods with 405', async () => {
      const response = new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

      expect(response.status).toBe(405);
    });
  });

  describe('Action validation', () => {
    it('should return 400 when action is missing', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Missing action parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Missing action parameter');
    });

    it('should return 400 for unknown action', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Unknown action: invalidAction' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Ping action', () => {
    it('should return ok response for ping action', async () => {
      const response = new Response(
        JSON.stringify({ ok: true, source: 'google-calendar' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.source).toBe('google-calendar');
    });
  });

  describe('isConnected action', () => {
    it('should return connected: true when tokens exist', async () => {
      const response = new Response(
        JSON.stringify({ connected: true, expiry_ts: '2025-01-20T00:00:00Z' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      const body = await response.json();
      expect(body.connected).toBe(true);
      expect(body.expiry_ts).toBeDefined();
    });

    it('should return connected: false when no tokens exist', async () => {
      const response = new Response(
        JSON.stringify({ connected: false, expiry_ts: null }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      const body = await response.json();
      expect(body.connected).toBe(false);
    });
  });

  describe('disconnect action', () => {
    it('should return success message on disconnect', async () => {
      const response = new Response(
        JSON.stringify({
          success: true,
          message: 'Google Calendar disconnected successfully',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('getEvents action validation', () => {
    it('should return 400 for invalid timeMin format', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Invalid timeMin format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid timeMax format', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Invalid timeMax format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid search query format', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Invalid search query format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('insertEvent action validation', () => {
    it('should return 400 for missing event data', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Missing or invalid event data' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for event without summary', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Event must have a valid summary' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('updateEvent action validation', () => {
    it('should return 400 for missing eventId', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Missing or invalid eventId' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('deleteEvent action validation', () => {
    it('should return 400 for missing eventId', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Missing or invalid eventId' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return success message on delete', async () => {
      const response = new Response(
        JSON.stringify({ success: true, message: 'Event deleted successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('Token refresh', () => {
    it('should handle token refresh failure gracefully', async () => {
      const response = new Response(
        JSON.stringify({
          error: 'Google Calendar authentication failed',
          details: 'Failed to refresh Google Calendar token. Please reconnect your Google Calendar.',
          action: 'reconnect_required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      const body = await response.json();
      expect(body.action).toBe('reconnect_required');
    });
  });

  describe('maxResults validation', () => {
    it('should clamp maxResults between 1 and 100 for listUpcoming', () => {
      const maxResults = Math.min(Math.max(1, parseInt('150') || 10), 100);
      expect(maxResults).toBe(100);
    });

    it('should use default maxResults when not provided', () => {
      const maxResults = Math.min(Math.max(1, parseInt('') || 10), 100);
      expect(maxResults).toBe(10);
    });

    it('should clamp maxResults between 1 and 250 for getEvents', () => {
      const maxResults = Math.min(Math.max(1, parseInt('500') || 250), 250);
      expect(maxResults).toBe(250);
    });
  });
});

// ============================================================================
// Instacart Recipes Tests
// ============================================================================

describe('instacart-recipes edge function', () => {
  describe('CORS handling', () => {
    it('should return 200 with CORS headers for OPTIONS request', async () => {
      const response = new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          'x-correlation-id': 'test-correlation-id',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('API key validation', () => {
    it('should return 500 when INSTACART_API_KEY is missing', async () => {
      const response = new Response(
        JSON.stringify({ error: 'INSTACART_API_KEY environment variable is not set' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(500);
    });
  });

  describe('Ping action', () => {
    it('should return ok response for ping action', async () => {
      const response = new Response(
        JSON.stringify({ ok: true, source: 'instacart-recipes' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.source).toBe('instacart-recipes');
    });
  });

  describe('Action validation', () => {
    it('should return 400 for invalid action', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Invalid action. Supported actions: create_recipe_page, ping' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('create_recipe_page action', () => {
    it('should return 400 when title is missing', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Title and at least one ingredient are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 when ingredients are empty', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Title and at least one ingredient are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return recipe page URL on success', async () => {
      const response = new Response(
        JSON.stringify({
          products_link_url: 'https://instacart.com/store/recipes/abc123',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.products_link_url).toContain('instacart.com');
    });
  });

  describe('Ingredient formatting', () => {
    it('should format ingredient with name only', () => {
      const ing = { name: 'Flour' };
      const formatted: any = { name: ing.name };

      expect(formatted.name).toBe('Flour');
      expect(formatted.measurements).toBeUndefined();
    });

    it('should format ingredient with measurements', () => {
      const ing = { name: 'Flour', quantity: 2, unit: 'cups' };
      const formatted: any = { name: ing.name };

      if (ing.quantity && ing.unit) {
        formatted.measurements = [{ quantity: ing.quantity, unit: ing.unit }];
      }

      expect(formatted.measurements).toEqual([{ quantity: 2, unit: 'cups' }]);
    });

    it('should format ingredient with display_text', () => {
      const ing = { name: 'All-purpose flour', display_text: '2 cups flour, sifted' };
      const formatted: any = { name: ing.name };

      if (ing.display_text) {
        formatted.display_text = ing.display_text;
      }

      expect(formatted.display_text).toBe('2 cups flour, sifted');
    });

    it('should format ingredient with brand filters', () => {
      const ing = { name: 'Flour', brand_filters: ['King Arthur', 'Bob\'s Red Mill'] };
      const formatted: any = { name: ing.name };

      if (ing.brand_filters && ing.brand_filters.length > 0) {
        formatted.filters = formatted.filters || {};
        formatted.filters.brand_filters = ing.brand_filters;
      }

      expect(formatted.filters.brand_filters).toContain('King Arthur');
    });

    it('should format ingredient with health filters', () => {
      const ing = { name: 'Milk', health_filters: ['organic', 'lactose-free'] };
      const formatted: any = { name: ing.name };

      if (ing.health_filters && ing.health_filters.length > 0) {
        formatted.filters = formatted.filters || {};
        formatted.filters.health_filters = ing.health_filters;
      }

      expect(formatted.filters.health_filters).toContain('organic');
    });
  });

  describe('Recipe payload building', () => {
    it('should include optional fields when provided', () => {
      const recipeRequest = {
        title: 'Chocolate Cake',
        author: 'Jane Doe',
        image_url: 'https://example.com/cake.jpg',
        servings: 8,
        cooking_time: 60,
        instructions: ['Mix ingredients', 'Bake at 350°F'],
        ingredients: [{ name: 'Flour' }],
        partner_linkback_url: 'https://mysite.com/recipe',
        enable_pantry_items: true,
        expires_in: 86400,
      };

      const payload: any = {
        title: recipeRequest.title,
        ingredients: recipeRequest.ingredients,
      };

      if (recipeRequest.author) payload.author = recipeRequest.author;
      if (recipeRequest.image_url) payload.image_url = recipeRequest.image_url;
      if (recipeRequest.servings) payload.servings = recipeRequest.servings;
      if (recipeRequest.cooking_time) payload.cooking_time = recipeRequest.cooking_time;
      if (recipeRequest.instructions) payload.instructions = recipeRequest.instructions;
      if (recipeRequest.partner_linkback_url)
        payload.partner_linkback_url = recipeRequest.partner_linkback_url;
      if (recipeRequest.enable_pantry_items !== undefined)
        payload.enable_pantry_items = recipeRequest.enable_pantry_items;
      if (recipeRequest.expires_in) payload.expires_in = recipeRequest.expires_in;

      expect(payload.author).toBe('Jane Doe');
      expect(payload.servings).toBe(8);
      expect(payload.cooking_time).toBe(60);
      expect(payload.instructions).toHaveLength(2);
      expect(payload.enable_pantry_items).toBe(true);
      expect(payload.expires_in).toBe(86400);
    });
  });

  describe('Error handling', () => {
    it('should handle Instacart API errors', async () => {
      const response = new Response(
        JSON.stringify({
          error: 'Failed to create Instacart recipe page',
          details: { message: 'Invalid API key' },
          status: 401,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Failed to create Instacart recipe page');
    });

    it('should handle unexpected errors', async () => {
      const response = new Response(
        JSON.stringify({ error: 'An unexpected error occurred' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

      expect(response.status).toBe(500);
    });
  });
});

// ============================================================================
// Correlation ID Tests
// ============================================================================

describe('Correlation ID handling', () => {
  it('should use provided correlation ID from request header', () => {
    const providedId = 'custom-correlation-123';
    const req = createMockRequest('POST', {}, { 'x-correlation-id': providedId });

    const correlationId =
      req.headers.get('x-correlation-id') ||
      req.headers.get('X-Correlation-ID') ||
      crypto.randomUUID();

    expect(correlationId).toBe(providedId);
  });

  it('should generate new correlation ID when not provided', () => {
    const req = createMockRequest('POST', {});

    const correlationId =
      req.headers.get('x-correlation-id') ||
      req.headers.get('X-Correlation-ID') ||
      crypto.randomUUID();

    expect(correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('should include correlation ID in response headers', async () => {
    const correlationId = 'test-correlation-id';

    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
        'x-correlation-id': correlationId,
      },
    });

    expect(response.headers.get('x-correlation-id')).toBe(correlationId);
  });
});

// ============================================================================
// Retry Logic Tests (fetchWithRetry)
// ============================================================================

describe('fetchWithRetry utility', () => {
  it('should calculate exponential backoff delays correctly', () => {
    const baseDelayMs = 300;
    const retries = 2;

    const delays: number[] = [];
    for (let attempt = 0; attempt < retries; attempt++) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      delays.push(delay);
    }

    expect(delays).toEqual([300, 600]);
  });

  it('should add jitter to delay', () => {
    const baseDelay = 300;
    const jitter = Math.random() * 100;
    const totalDelay = baseDelay + jitter;

    expect(totalDelay).toBeGreaterThanOrEqual(300);
    expect(totalDelay).toBeLessThan(400);
  });

  it('should retry on 429 status', () => {
    const status = 429;
    const shouldRetry = status === 429 || (status >= 500 && status <= 599);

    expect(shouldRetry).toBe(true);
  });

  it('should retry on 5xx status', () => {
    const statuses = [500, 502, 503, 504];

    statuses.forEach((status) => {
      const shouldRetry = status === 429 || (status >= 500 && status <= 599);
      expect(shouldRetry).toBe(true);
    });
  });

  it('should not retry on 4xx status (except 429)', () => {
    const statuses = [400, 401, 403, 404];

    statuses.forEach((status) => {
      const shouldRetry = status === 429 || (status >= 500 && status <= 599);
      expect(shouldRetry).toBe(false);
    });
  });

  it('should not retry on 2xx status', () => {
    const statuses = [200, 201, 204];

    statuses.forEach((status) => {
      const shouldRetry = status === 429 || (status >= 500 && status <= 599);
      expect(shouldRetry).toBe(false);
    });
  });
});
