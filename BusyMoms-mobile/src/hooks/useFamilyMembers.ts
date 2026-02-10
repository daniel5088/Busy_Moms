import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familyService, type CreateFamilyMemberInput, type UpdateFamilyMemberInput } from '../services/familyService';

const FAMILY_MEMBERS_QUERY_KEY = 'family-members';

export function useFamilyMembers(userId: string) {
  return useQuery({
    queryKey: [FAMILY_MEMBERS_QUERY_KEY, userId],
    queryFn: () => familyService.getFamilyMembers(userId),
    enabled: !!userId,
  });
}

export function useFamilyMember(memberId: string, userId: string) {
  return useQuery({
    queryKey: [FAMILY_MEMBERS_QUERY_KEY, memberId, userId],
    queryFn: () => familyService.getFamilyMemberById(memberId, userId),
    enabled: !!memberId && !!userId,
  });
}

export function useCreateFamilyMember(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFamilyMemberInput) => familyService.createFamilyMember(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FAMILY_MEMBERS_QUERY_KEY] }),
  });
}

export function useUpdateFamilyMember(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, updates }: { memberId: string; updates: UpdateFamilyMemberInput }) =>
      familyService.updateFamilyMember(memberId, userId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FAMILY_MEMBERS_QUERY_KEY] }),
  });
}

export function useDeleteFamilyMember(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => familyService.deleteFamilyMember(memberId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FAMILY_MEMBERS_QUERY_KEY] }),
  });
}
