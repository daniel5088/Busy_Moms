import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFamilyMembers, useCreateFamilyMember, useUpdateFamilyMember, useDeleteFamilyMember } from '../../src/hooks/useFamilyMembers';
import { useAuth } from '../../src/hooks/useAuth';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { FamilyHub } from '../../src/components/family/FamilyHub';
import { FamilyMemberForm } from '../../src/components/family/FamilyMemberForm';
import { Loading } from '../../src/components/ui/Loading';
import type { FamilyMember } from '../../src/types/database';
import type { CreateFamilyMemberInput, UpdateFamilyMemberInput } from '../../src/services/familyService';

export default function FamilyScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const { data: familyMembers = [], isLoading } = useFamilyMembers(user?.id || '');
  const createMember = useCreateFamilyMember(user?.id || '');
  const updateMember = useUpdateFamilyMember(user?.id || '');
  const deleteMember = useDeleteFamilyMember(user?.id || '');

  const handleSubmit = async (data: Partial<FamilyMember>) => {
    if (editingMember) {
      await updateMember.mutateAsync({ memberId: editingMember.id, updates: data as UpdateFamilyMemberInput });
    } else {
      await createMember.mutateAsync(data as CreateFamilyMemberInput);
    }
    setIsFormVisible(false);
    setEditingMember(null);
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setIsFormVisible(true);
  };

  const handleDelete = async (memberId: string) => {
    await deleteMember.mutateAsync(memberId);
  };

  if (isLoading) return <Screen><Header title="Family" /><Loading /></Screen>;

  return (
    <Screen>
      <Header title="Family Hub" />
      <View style={{ flex: 1, padding: 16 }}>
        <FamilyHub
          familyMembers={familyMembers}
          onAddMember={() => setIsFormVisible(true)}
          onEditMember={handleEdit}
          onDeleteMember={handleDelete}
          onViewFolders={() => {}}
          onViewContacts={() => router.push('/(tabs)/more')}
          onViewTasks={() => {}}
          onViewShopping={() => router.push('/(tabs)/shopping')}
        />
      </View>
      <FamilyMemberForm
        isVisible={isFormVisible}
        onClose={() => { setIsFormVisible(false); setEditingMember(null); }}
        onSubmit={handleSubmit}
        editMember={editingMember}
        isLoading={createMember.isPending || updateMember.isPending}
      />
    </Screen>
  );
}
