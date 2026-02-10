/**
 * useContacts Hook
 * React Query hook for contact management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contactService,
  type ContactFilters,
  type CreateContactInput,
  type UpdateContactInput,
} from '../services/contactService';
import { googleContactsService } from '../services/googleContactsService';
import type { Contact } from '../types/database';

const CONTACTS_QUERY_KEY = 'contacts';

export function useContacts(userId: string, filters?: ContactFilters) {
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, userId, filters],
    queryFn: () => contactService.getContacts(userId, filters),
    enabled: !!userId,
  });
}

export function useContact(contactId: string, userId: string) {
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, contactId, userId],
    queryFn: () => contactService.getContactById(contactId, userId),
    enabled: !!contactId && !!userId,
  });
}

export function useContactsByCategory(userId: string) {
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, 'by-category', userId],
    queryFn: () => contactService.getContactsByCategory(userId),
    enabled: !!userId,
  });
}

export function useContactCategories(userId: string) {
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, 'categories', userId],
    queryFn: () => contactService.getContactCategories(userId),
    enabled: !!userId,
  });
}

export function useCreateContact(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateContactInput) => contactService.createContact(userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}

export function useUpdateContact(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, updates }: { contactId: string; updates: UpdateContactInput }) =>
      contactService.updateContact(contactId, userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}

export function useDeleteContact(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) => contactService.deleteContact(contactId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}

export function useSearchContacts(userId: string) {
  return useMutation({
    mutationFn: (searchTerm: string) => contactService.searchContacts(userId, searchTerm),
  });
}

export function useGoogleContactsSync(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (onProgress?: (current: number, total: number) => void) =>
      googleContactsService.syncContactsFromGoogle(userId, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}

export function useSyncContactToGoogle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contact: Contact) => googleContactsService.syncContactToGoogle(contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}

export function useGoogleContactsConnection() {
  return useQuery({
    queryKey: ['google-contacts-connection'],
    queryFn: () => googleContactsService.isConnected(),
  });
}
