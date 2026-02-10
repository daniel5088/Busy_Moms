/**
 * TaskForm Component
 * Modal form for creating and editing tasks
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  Alert,
} from 'react-native';
import { Check, User, Calendar, Clock, Star } from 'lucide-react-native';
// @ts-ignore
import type { Task, FamilyMember } from '../../types/database';
import type { CreateTaskInput, UpdateTaskInput } from '../../services/taskService';
import { useTheme } from '../../hooks/useTheme';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

interface TaskFormProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => void;
  familyMembers?: FamilyMember[];
  editTask?: Task | null;
  currentUserEmail?: string;
  isLoading?: boolean;
}

const CATEGORY_OPTIONS = [
  { label: 'Chores 🧹', value: 'chores' },
  { label: 'Homework 📚', value: 'homework' },
  { label: 'Sports ⚽', value: 'sports' },
  { label: 'Music 🎵', value: 'music' },
  { label: 'Health 🏥', value: 'health' },
  { label: 'Social 👥', value: 'social' },
  { label: 'Other 📋', value: 'other' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const RECURRING_PATTERN_OPTIONS = [
  { label: 'Select frequency', value: '' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export function TaskForm({
  isVisible,
  onClose,
  onSubmit,
  familyMembers = [],
  editTask,
  currentUserEmail,
  isLoading,
}: TaskFormProps) {
  const { theme } = useTheme();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assigned_to_email: '',
    due_date: '',
    due_time: '',
    points: 0,
    notes: '',
    recurring: false,
    recurring_pattern: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Update form data when editTask changes
  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title || '',
        description: editTask.description || '',
        category: editTask.category || 'other',
        priority: (editTask.priority as 'low' | 'medium' | 'high') || 'medium',
        assigned_to_email: editTask.assigned_to_email || '',
        due_date: editTask.due_date || '',
        due_time: editTask.due_time || '',
        points: editTask.points || 0,
        notes: editTask.notes || '',
        recurring: editTask.recurring || false,
        recurring_pattern: editTask.recurring_pattern || '',
      });
    } else {
      resetForm();
    }
  }, [editTask, isVisible]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'other',
      priority: 'medium',
      assigned_to_email: '',
      due_date: '',
      due_time: '',
      points: 0,
      notes: '',
      recurring: false,
      recurring_pattern: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      Alert.alert('Required Field', 'Please enter a task title');
      return;
    }

    const submitData: CreateTaskInput | UpdateTaskInput = {
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category,
      priority: formData.priority,
      assigned_to_email: formData.assigned_to_email || undefined,
      assigned_by_name: formData.assigned_to_email ? currentUserEmail : undefined,
      due_date: formData.due_date || undefined,
      due_time: formData.due_time || undefined,
      points: formData.points,
      notes: formData.notes || undefined,
      recurring: formData.recurring,
      recurring_pattern: formData.recurring ? formData.recurring_pattern || undefined : undefined,
    };

    onSubmit(submitData);
    resetForm();
  };

  const handleDateChange = (event: { type: string; nativeEvent: { timestamp: number } }, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0] || '';
      setFormData({ ...formData, due_date: dateString });
    }
  };

  const handleTimeChange = (event: { type: string; nativeEvent: { timestamp: number } }, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}:00`;
      setFormData({ ...formData, due_time: timeString });
    }
  };

  // Prepare family member options
  const memberOptions = [
    { label: 'No assignment', value: '' },
    ...familyMembers
      .filter((member) => member.Email) // Only show members with email
      .map((member) => ({
        label: `${member.name || member.Email}`,
        value: member.Email,
      })),
  ];

  return (
    <Modal visible={isVisible} onClose={onClose} title={editTask ? 'Edit Task' : 'Create Task'}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>
            <Check size={14} color={theme.colors.text.primary} /> Task Title *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.gray[300],
                color: theme.colors.text.primary,
              },
            ]}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="e.g., Clean room, Do homework"
            placeholderTextColor={theme.colors.text.secondary}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.gray[300],
                color: theme.colors.text.primary,
              },
            ]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Additional details about the task"
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Category and Priority */}
        <View style={styles.row}>
          <View style={[styles.fieldContainer, styles.halfWidth]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Category</Text>
            <Select
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              options={CATEGORY_OPTIONS}
            />
          </View>

          <View style={[styles.fieldContainer, styles.halfWidth]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Priority</Text>
            <Select
              value={formData.priority}
              onChange={(value) =>
                setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' })
              }
              options={PRIORITY_OPTIONS}
            />
          </View>
        </View>

        {/* Assign to Family Member */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>
            <User size={14} color={theme.colors.text.primary} /> Assign to Family Member
          </Text>
          <Select
            value={formData.assigned_to_email}
            onChange={(value) => setFormData({ ...formData, assigned_to_email: value })}
            options={memberOptions}
          />
          {familyMembers.length === 0 && (
            <Text style={[styles.hint, { color: theme.colors.text.secondary }]}>
              Add family members in Settings to assign tasks
            </Text>
          )}
        </View>

        {/* Due Date and Time */}
        <View style={styles.row}>
          <View style={[styles.fieldContainer, styles.halfWidth]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>
              <Calendar size={14} color={theme.colors.text.primary} /> Due Date
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.gray[300],
                },
              ]}
            >
              <Text style={{ color: formData.due_date ? theme.colors.text.primary : theme.colors.text.secondary }}>
                {formData.due_date || 'Select date'}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={formData.due_date ? new Date(formData.due_date) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>

          <View style={[styles.fieldContainer, styles.halfWidth]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>
              <Clock size={14} color={theme.colors.text.primary} /> Due Time
            </Text>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.gray[300],
                },
              ]}
            >
              <Text style={{ color: formData.due_time ? theme.colors.text.primary : theme.colors.text.secondary }}>
                {formData.due_time ? formData.due_time.substring(0, 5) : 'Select time'}
              </Text>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={
                  formData.due_time
                    ? new Date(`2000-01-01T${formData.due_time}`)
                    : new Date()
                }
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </View>
        </View>

        {/* Points */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>
            <Star size={14} color={theme.colors.text.primary} /> Points (for gamification)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.gray[300],
                color: theme.colors.text.primary,
              },
            ]}
            value={formData.points.toString()}
            onChangeText={(text) => setFormData({ ...formData, points: parseInt(text) || 0 })}
            placeholder="Reward points for completing this task"
            placeholderTextColor={theme.colors.text.secondary}
            keyboardType="numeric"
          />
        </View>

        {/* Notes */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Notes</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.gray[300],
                color: theme.colors.text.primary,
              },
            ]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Additional notes or instructions"
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Recurring */}
        <View style={styles.fieldContainer}>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Recurring task</Text>
            <Switch
              value={formData.recurring}
              onValueChange={(value) => setFormData({ ...formData, recurring: value })}
              trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary.main }}
              thumbColor={theme.colors.background.secondary}
            />
          </View>
          {formData.recurring && (
            <Select
              value={formData.recurring_pattern}
              onChange={(value) => setFormData({ ...formData, recurring_pattern: value })}
              options={RECURRING_PATTERN_OPTIONS}
            />
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button title="Cancel" onPress={onClose} variant="outline" style={styles.actionButton} />
        <Button
          title={editTask ? 'Update Task' : 'Create Task'}
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.actionButton}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
});
