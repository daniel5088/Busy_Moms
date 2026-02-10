import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import type { Contact } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface ContactFormProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Contact>) => void;
  editContact?: Contact | null;
  isLoading?: boolean;
}

const CATEGORY_OPTIONS = [
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Education', value: 'education' },
  { label: 'Childcare', value: 'childcare' },
  { label: 'Service', value: 'service' },
  { label: 'Emergency', value: 'emergency' },
  { label: 'Other', value: 'other' },
];

export function ContactForm({ isVisible, onClose, onSubmit, editContact, isLoading }: ContactFormProps) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '', role: '', phone: '', email: '', category: 'other', rating: 0, notes: '',
  });

  useEffect(() => {
    if (editContact) {
      setFormData({
        name: editContact.name || '',
        role: editContact.role || '',
        phone: editContact.phone || '',
        email: editContact.email || '',
        category: editContact.category || 'other',
        rating: editContact.rating || 0,
        notes: editContact.notes || '',
      });
    } else {
      setFormData({ name: '', role: '', phone: '', email: '', category: 'other', rating: 0, notes: '' });
    }
  }, [editContact, isVisible]);

  return (
    <Modal visible={isVisible} onClose={onClose} title={editContact ? 'Edit Contact' : 'Create Contact'}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Name *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Contact name" placeholderTextColor={theme.colors.text.secondary} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Role *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.role} onChangeText={(text) => setFormData({ ...formData, role: text })} placeholder="e.g., Pediatrician, Teacher" placeholderTextColor={theme.colors.text.secondary} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}><User size={14} color={theme.colors.text.primary} /> Phone</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.phone} onChangeText={(text) => setFormData({ ...formData, phone: text })} placeholder="Phone number" placeholderTextColor={theme.colors.text.secondary} keyboardType="phone-pad" />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}><User size={14} color={theme.colors.text.primary} /> Email</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} placeholder="Email address" placeholderTextColor={theme.colors.text.secondary} keyboardType="email-address" />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Category</Text>
          <Select value={formData.category} onChange={(value) => setFormData({ ...formData, category: value })} options={CATEGORY_OPTIONS} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.notes} onChangeText={(text) => setFormData({ ...formData, notes: text })} placeholder="Additional notes" placeholderTextColor={theme.colors.text.secondary} multiline numberOfLines={3} />
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button title="Cancel" onPress={onClose} variant="outline" style={styles.actionButton} />
        <Button title={editContact ? 'Update' : 'Create'} onPress={() => onSubmit(formData)} loading={isLoading} style={styles.actionButton} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollView: { maxHeight: 500 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: { flex: 1 },
});
