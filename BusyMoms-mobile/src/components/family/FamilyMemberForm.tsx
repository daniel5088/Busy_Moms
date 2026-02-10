import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import type { FamilyMember } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface FamilyMemberFormProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<FamilyMember>) => void;
  editMember?: FamilyMember | null;
  isLoading?: boolean;
}

const GENDER_OPTIONS = [
  { label: 'Boy', value: 'Boy' },
  { label: 'Girl', value: 'Girl' },
  { label: 'Other', value: 'Other' },
];

export function FamilyMemberForm({ isVisible, onClose, onSubmit, editMember, isLoading }: FamilyMemberFormProps) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({ name: '', Email: '', age: '', birthday: '', gender: 'Other', relationship: '', allergies: '', medical_notes: '', school: '', grade: '' });

  useEffect(() => {
    if (editMember) {
      setFormData({
        name: editMember.name || '',
        Email: editMember.Email || '',
        age: editMember.age?.toString() || '',
        birthday: editMember.birthday || '',
        gender: editMember.gender || 'Other',
        relationship: editMember.relationship || '',
        allergies: editMember.allergies?.join(', ') || '',
        medical_notes: editMember.medical_notes || '',
        school: editMember.school || '',
        grade: editMember.grade || '',
      });
    } else {
      setFormData({ name: '', Email: '', age: '', birthday: '', gender: 'Other', relationship: '', allergies: '', medical_notes: '', school: '', grade: '' });
    }
  }, [editMember, isVisible]);

  const handleSubmit = () => {
    const submitData: Partial<FamilyMember> = {
      ...formData,
      age: formData.age ? parseInt(formData.age) : undefined,
      gender: formData.gender as 'Boy' | 'Girl' | 'Other',
      allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
    };
    onSubmit(submitData);
  };

  return (
    <Modal visible={isVisible} onClose={onClose} title={editMember ? 'Edit Family Member' : 'Add Family Member'}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Name *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Full name" placeholderTextColor={theme.colors.text.secondary} />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Email *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.Email} onChangeText={(text) => setFormData({ ...formData, Email: text })} placeholder="Email address" placeholderTextColor={theme.colors.text.secondary} keyboardType="email-address" />
        </View>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Age</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.age} onChangeText={(text) => setFormData({ ...formData, age: text })} placeholder="Age" placeholderTextColor={theme.colors.text.secondary} keyboardType="numeric" />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Gender</Text>
            <Select value={formData.gender} onChange={(value) => setFormData({ ...formData, gender: value })} options={GENDER_OPTIONS} />
          </View>
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Relationship</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300], color: theme.colors.text.primary }]} value={formData.relationship} onChangeText={(text) => setFormData({ ...formData, relationship: text })} placeholder="e.g., Daughter, Son" placeholderTextColor={theme.colors.text.secondary} />
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Button title="Cancel" onPress={onClose} variant="outline" style={{ flex: 1 }} />
        <Button title={editMember ? 'Update' : 'Add'} onPress={handleSubmit} loading={isLoading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollView: { maxHeight: 400 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
