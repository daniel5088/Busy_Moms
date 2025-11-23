
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock
} from 'vitest';

// ---- Mock Supabase so sendToInstacart sees an authenticated user ----
vi.mock('../src/lib/supabase.ts', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-access-token',
            user: { id: 'test-user-id' },
          },
        },
      }),
    },
  },
}));

import { instacartShoppingService } from '../src/services/instacartShoppingService';

const originalFetch = global.fetch;

describe('Instacart Shopping Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it('shapes the request body correctly', async () => {
    const fetchMock = global.fetch as unknown as Mock;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: 'https://instacart.com/fake-link' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const items = [
      { name: 'Milk', quantity: 2, unit: 'liter' },
      { name: 'Eggs', quantity: 12, unit: 'count' },
    ];

    const result = await instacartShoppingService.createCartLink({
      items,
      retailerId: 'costco',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    expect(String(url)).toContain('/instacart');

    const body = JSON.parse(options.body);
    expect(body.items).toEqual([
      { name: 'Milk', quantity: 2, unit: 'liter' },
      { name: 'Eggs', quantity: 12, unit: 'count' },
    ]);
    expect(body.retailerId).toBe('costco');

    expect(result.url).toBe('https://instacart.com/fake-link');
  });

  it('handles 4xx errors by returning a user-friendly error', async () => {
    const fetchMock = global.fetch as unknown as Mock;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Bad request' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      instacartShoppingService.createCartLink({
        items: [],
        retailerId: 'costco',
      }),
    ).rejects.toThrow(/instacart/i);
  });

  it('retries on 5xx/429 (if using networkClient)', async () => {
    const fetchMock = global.fetch as unknown as Mock;

    fetchMock
      .mockResolvedValueOnce(new Response('server error', { status: 500 }))
      .mockResolvedValueOnce(new Response('server error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: 'https://insAtacart.com/retry-link' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const result = await instacartShoppingService.createCartLink({
      items: [{ name: 'Milk', quantity: 1, unit: 'liter' }],
      retailerId: 'wholefoods',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.url).toBe('https://instacart.com/retry-link');
  });
});
