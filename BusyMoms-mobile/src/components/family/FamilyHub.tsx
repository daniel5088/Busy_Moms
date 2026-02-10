import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { Plus, Users, FolderOpen, ShoppingBag, Check } from 'lucide-react-native';
// @ts-ignore
import type { FamilyMember } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';
import { FamilyMemberCard } from './FamilyMemberCard';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface FamilyHubProps {
  familyMembers: FamilyMember[];
  onAddMember: () => void;
  onEditMember: (member: FamilyMember) => void;
  onDeleteMember: (memberId: string) => void;
  onViewFolders?: () => void;
  onViewContacts?: () => void;
  onViewTasks?: () => void;
  onViewShopping?: () => void;
}

export function FamilyHub({
  familyMembers,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onViewFolders,
  onViewContacts,
  onViewTasks,
  onViewShopping,
}: FamilyHubProps) {
  const { theme } = useTheme();

  const quickActions = [
    { icon: FolderOpen, label: 'Folders', onPress: onViewFolders },
    { icon: Users, label: 'Contacts', onPress: onViewContacts },
    { icon: Check, label: 'Tasks', onPress: onViewTasks },
    { icon: ShoppingBag, label: 'Shopping', onPress: onViewShopping },
  ];

  return (
    <View style={styles.container}>
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((action, index) => (
          <Pressable
            key={index}
            onPress={action.onPress}
            style={[styles.quickActionCard, { backgroundColor: theme.colors.background.secondary }]}
          >
            <action.icon size={24} color={theme.colors.primary.main} />
            <Text style={[styles.quickActionLabel, { color: theme.colors.text.primary }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Family Members Grid */}
      {familyMembers.length > 0 ? (
        <FlatList
          data={familyMembers}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <FamilyMemberCard member={item} onEdit={onEditMember} onDelete={onDeleteMember} />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Family Members</Text>
              <Button title="Add Member" icon={<Plus size={20} color={theme.colors.primary.main} />} onPress={onAddMember} size="sm" />
            </View>
          }
        />
      ) : (
        <EmptyState
          icon={<Users size={48} color={theme.colors.text.secondary} />}
          title="No family members yet"
          description="Add family members to assign tasks and events"
          actionLabel="Add First Member"
          onAction={onAddMember}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickActionCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, gap: 8 },
  quickActionLabel: { fontSize: 13, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  row: { gap: 12, marginBottom: 12 },
});
