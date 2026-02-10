/**
 * React Query client configuration
 * Provides caching, refetching, and offline support for server state
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // Use cache first, then fetch when online
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for this long
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - cache time for offline access
      retry: 2, // Retry failed queries 2 times
      refetchOnWindowFocus: true, // Refetch when app comes to foreground
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts
    },
    mutations: {
      networkMode: 'offlineFirst', // Queue mutations when offline
      retry: 1, // Retry failed mutations once
    },
  },
});

/**
 * Query key factory for consistent key structure
 * Usage: queryKeys.events.all, queryKeys.events.detail('event-id')
 */
export const queryKeys = {
  events: {
    all: ['events'] as const,
    byDate: (date: string) => ['events', 'byDate', date] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    byStatus: (status: string) => ['tasks', 'byStatus', status] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
  shopping: {
    all: ['shopping'] as const,
    byCategory: (category: string) => ['shopping', 'byCategory', category] as const,
    detail: (id: string) => ['shopping', 'detail', id] as const,
  },
  recipes: {
    all: ['recipes'] as const,
    saved: ['recipes', 'saved'] as const,
    detail: (id: string) => ['recipes', 'detail', id] as const,
    search: (query: string) => ['recipes', 'search', query] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    byCategory: (category: string) => ['contacts', 'byCategory', category] as const,
    detail: (id: string) => ['contacts', 'detail', id] as const,
  },
  family: {
    all: ['family'] as const,
    detail: (id: string) => ['family', 'detail', id] as const,
  },
  profile: {
    current: ['profile', 'current'] as const,
  },
  affirmations: {
    all: ['affirmations'] as const,
    today: ['affirmations', 'today'] as const,
    settings: ['affirmations', 'settings'] as const,
  },
  weather: {
    current: (lat: number, lng: number) =>
      ['weather', 'current', { lat, lng }] as const,
  },
  dashboard: {
    data: ['dashboard', 'data'] as const,
  },
  settings: {
    all: ['settings'] as const,
    addresses: ['settings', 'addresses'] as const,
    notifications: ['settings', 'notifications'] as const,
    measurement: ['settings', 'measurement'] as const,
  },
};
