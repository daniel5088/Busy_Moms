import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { User, Edit2, Trash2, MessageCircle } from 'lucide-react-native';
// @ts-ignore
import type { Contact } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from '../ui/Badge';

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const { theme } = useTheme();

  const handleCall = () => {
    if (contact.phone) {
      Linking.openURL(`tel:${contact.phone}`);
    }
  };

  const handleEmail = () => {
    if (contact.email) {
      Linking.openURL(`mailto:${contact.email}`);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Contact', 'Are you sure you want to delete this contact?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(contact.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300] }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: theme.colors.text.primary }]}>{contact.name}</Text>
          {contact.rating && (
            <View style={styles.rating}>
              {[...Array(contact.rating)].map((_, i) => (
                <Text key={i} style={styles.star}>⭐</Text>
              ))}
            </View>
          )}
        </View>

        <Text style={[styles.role, { color: theme.colors.text.secondary }]}>{contact.role}</Text>

        {contact.category && (
          <Badge text={contact.category} variant="neutral" style={styles.category} />
        )}

        <View style={styles.info}>
          {contact.phone && (
            <Pressable onPress={handleCall} style={styles.infoRow}>
              <User size={14} color={theme.colors.primary.main} />
              <Text style={[styles.infoText, { color: theme.colors.text.primary }]}>{contact.phone}</Text>
            </Pressable>
          )}
          {contact.email && (
            <Pressable onPress={handleEmail} style={styles.infoRow}>
              <MessageCircle size={14} color={theme.colors.primary.main} />
              <Text style={[styles.infoText, { color: theme.colors.text.primary }]}>{contact.email}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => onEdit(contact)} style={[styles.actionButton, { backgroundColor: theme.colors.primary.main + '20' }]}>
          <Edit2 size={16} color={theme.colors.primary.main} />
        </Pressable>
        <Pressable onPress={handleDelete} style={[styles.actionButton, { backgroundColor: theme.colors.status.error + '20' }]}>
          <Trash2 size={16} color={theme.colors.status.error} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12, flexDirection: 'row', gap: 12 },
  content: { flex: 1, gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  rating: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 12 },
  role: { fontSize: 14 },
  category: { alignSelf: 'flex-start' },
  info: { gap: 6, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14 },
  actions: { gap: 6 },
  actionButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
