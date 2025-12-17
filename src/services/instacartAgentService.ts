// src/services/instacartAgentService.ts

/**
 * Instacart Agent Service
 *
 * - sendToInstacartSmart(text)  → creates a shopping list via Supabase Edge
 *   function `instacart-agent` (which calls Instacart MCP).
 *   This function:
 *     • DOES NOT use OpenAI (no quota issues)
 *     • Parses simple commands like "add milk in my instacart"
 *
 * - getNearbyRetailers(postalCode, countryCode) → calls Edge function
 *   `instacart-shopping-list` with action "get_nearby_retailers".
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

// Optional override – if not set, we derive from SUPABASE_URL
const FUNCTIONS_BASE =
  (import.meta.env.VITE_FUNCTIONS_URL as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '');

const FUNCTIONS_BASE_CLEAN = (FUNCTIONS_BASE || '').replace(/\/+$/, '');

const INSTACART_AGENT_URL = `${FUNCTIONS_BASE_CLEAN}/instacart-agent`;
const INSTACART_SHOPPING_LIST_URL = `${FUNCTIONS_BASE_CLEAN}/instacart-shopping-list`;

export interface InstacartItem {
  name: string;
  quantity?: number | null;
  unit?: string | null;
}

export interface InstacartAgentResponse {
  status: 'success' | 'error';
  message?: string;

  // Shopping list fields
  items?: InstacartItem[];
  instacart_list_url?: string;
  shopping_list_url?: string;

  // Recipe fields
  recipe_url?: string;
  recipe?: {
    title: string;
    servings: number;
    prep_time: string;
    cook_time: string;
    ingredients: InstacartItem[];
    instructions: string[];
  };

  [key: string]: any;
}

/** Build Supabase auth headers so Edge Functions don't return 401. */
function buildFunctionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!SUPABASE_ANON_KEY) {
    console.warn(
      '[InstacartAgentService] VITE_SUPABASE_ANON_KEY is missing – Edge Functions may fail with 401',
    );
    return headers;
  }

  // Supabase expects both `apikey` and `Authorization: Bearer <token>`
  headers.apikey = SUPABASE_ANON_KEY;
  headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;

  return headers;
}

/**
 * Very simple parser:
 *   "add milk in my instacart" → [{ name: "milk" }]
 *   "add milk and bread to instacart" → [{ name: "milk" }, { name: "bread" }]
 *
 * We intentionally keep it dumb but robust so we don't need OpenAI.
 */
function parseShoppingSentence(
  text: string,
): { title: string; items: InstacartItem[] } {
  const original = text.trim();
  const lower = original.toLowerCase();

  let itemsChunk = original;

  // Try to capture the bit between "add" and "to/in ...instacart/cart"
  const m = original.match(
    /add\s+(.+?)\s+(?:to|in|into)\s+(?:my\s+)?(?:instacart|cart)/i,
  );
  if (m?.[1]) {
    itemsChunk = m[1];
  } else if (lower.startsWith('add ')) {
    // Fallback: "add milk" → "milk"
    itemsChunk = original.slice(4);
  }

  // Split on commas and "and"
  const rawParts = itemsChunk
    .split(/,| and /i)
    .map((p) => p.trim())
    .filter(Boolean);

  const items: InstacartItem[] =
    rawParts.length > 0
      ? rawParts.map((name) => ({
          name,
          quantity: null,
          unit: null,
        }))
      : [
          {
            name: original,
            quantity: null,
            unit: null,
          },
        ];

  const title = 'Shopping list from Sara';

  return { title, items };
}

/**
 * Main entry point used by OpenAIRealtimeService.
 *
 * - Always bypasses OpenAI (we send `items` directly so the Edge Function
 *   skips extraction).
 * - Sends proper Supabase auth headers to avoid 401 "Missing authorization header".
 */
export async function sendToInstacartSmart(
  shoppingText: string,
): Promise<InstacartAgentResponse> {
  if (!INSTACART_AGENT_URL) {
    throw new Error('Instacart agent URL is not configured');
  }

  const { title, items } = parseShoppingSentence(shoppingText);

  if (!items.length) {
    throw new Error(
      "I couldn't find any grocery items in your request. Try saying e.g. 'add milk in my Instacart'.",
    );
  }

  const body = {
    // This tells the Edge Function to use the shopping-list path
    tool: 'create-shopping-list' as const,
    title,
    items,
  };

  console.log('🛒 sendToInstacartSmart → calling instacart-agent with:', body);

  const res = await fetch(INSTACART_AGENT_URL, {
    method: 'POST',
    headers: buildFunctionHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: InstacartAgentResponse | null = null;
  try {
    data = text ? (JSON.parse(text) as InstacartAgentResponse) : null;
  } catch {
    // leave as null – we'll handle below
  }

  if (!res.ok) {
    // Edge Function-level error (e.g., 401/500)
    const msg =
      data?.message ||
      `Edge Function returned a non-2xx status code (${res.status})`;
    console.error('❌ Instacart Edge Function error:', { status: res.status, text });
    throw new Error(msg);
  }

  if (!data) {
    throw new Error('Instacart agent returned an empty response');
  }

  if (data.status === 'error') {
    console.error('❌ Instacart agent reported error:', data);
    throw new Error(data.message || 'Instacart agent reported an error');
  }

  console.log('🛒 Instacart agent success:', data);
  return data;
}

/**
 * Used by the retailer selection UI.
 *
 * Calls Edge Function `instacart-shopping-list` with action "get_nearby_retailers".
 */
export interface NearbyRetailer {
  retailer_key: string;
  name: string;
  retailer_logo_url: string;
}

export interface NearbyRetailersResponse {
  retailers: NearbyRetailer[];
}

export async function getNearbyRetailers(
  postalCode: string,
  countryCode = 'US',
): Promise<NearbyRetailersResponse> {
  if (!INSTACART_SHOPPING_LIST_URL) {
    throw new Error('Instacart shopping-list URL is not configured');
  }

  const body = {
    action: 'get_nearby_retailers',
    postal_code: postalCode,
    country_code: countryCode,
  };

  console.log('🏬 getNearbyRetailers → calling Edge Function with:', body);

  const res = await fetch(INSTACART_SHOPPING_LIST_URL, {
    method: 'POST',
    headers: buildFunctionHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      `Edge Function returned status ${res.status}`;
    console.error('❌ getNearbyRetailers error:', { status: res.status, data });
    throw new Error(msg);
  }

  return data as NearbyRetailersResponse;
}
