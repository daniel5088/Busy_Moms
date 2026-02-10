import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Edit2, Trash2 } from 'lucide-react-native';
// @ts-ignore
import type { FamilyMember } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../ui/Avatar';

interface FamilyMemberCardProps {
  member: FamilyMember;
  onEdit: (member: FamilyMember) => void;
  onDelete: (memberId: string) => void;
}

export function FamilyMemberCard({ member, onEdit, onDelete }: FamilyMemberCardProps) {
  const { theme } = useTheme();

  const handleDelete = () => {
    Alert.alert('Delete Family Member', `Remove ${member.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(member.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300] }]}>
      <Avatar name={member.name} size={48} />
      <Text style={[styles.name, { color: theme.colors.text.primary }]} numberOfLines={1}>{member.name}</Text>
      {member.relationship && <Text style={[styles.relationship, { color: theme.colors.text.secondary }]} numberOfLines={1}>{member.relationship}</Text>}
      {member.age && <Text style={[styles.age, { color: theme.colors.text.secondary }]}>{member.age} years</Text>}
      <View style={styles.actions}>
        <Pressable onPress={() => onEdit(member)} style={[styles.actionBtn, { backgroundColor: theme.colors.primary.main + '20' }]}>
          <Edit2 size={14} color={theme.colors.primary.main} />
        </Pressable>
        <Pressable onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: theme.colors.status.error + '20' }]}>
          <Trash2 size={14} color={theme.colors.status.error} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  name: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  relationship: { fontSize: 13 },
  age: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  actionBtn: { padding: 6, borderRadius: 6 },
});
