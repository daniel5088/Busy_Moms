/**
 * Task Detail Screen
 * View and edit a specific task
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2, Edit2, Calendar, User, Check } from 'lucide-react-native';
import { useTask, useUpdateTask, useDeleteTask, useToggleTaskStatus } from '../../src/hooks/useTasks';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { TaskForm } from '../../src/components/tasks/TaskForm';
import { Loading } from '../../src/components/ui/Loading';
import { formatDate } from '../../src/utils/timeFormatters';
import type { CreateTaskInput, UpdateTaskInput } from '../../src/services/taskService';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const { data: task, isLoading } = useTask(id, user?.id || '');
  const updateTask = useUpdateTask(user?.id || '');
  const deleteTask = useDeleteTask(user?.id || '');
  const toggleStatus = useToggleTaskStatus(user?.id || '');

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask.mutateAsync(id);
          router.back();
        },
      },
    ]);
  };

  const handleToggleStatus = () => {
    if (task) {
      toggleStatus.mutate({ taskId: task.id, currentStatus: task.status || 'pending' });
    }
  };

  const handleUpdate = async (updates: CreateTaskInput | UpdateTaskInput) => {
    await updateTask.mutateAsync({ taskId: id, updates: updates as UpdateTaskInput });
    setIsEditModalVisible(false);
  };

  if (isLoading) {
    return (
      <Screen>
        <Header title="Task Details" onBack={() => router.back()} />
        <Loading />
      </Screen>
    );
  }

  if (!task) {
    return (
      <Screen>
        <Header title="Task Details" onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.status.error }]}>Task not found</Text>
        </View>
      </Screen>
    );
  }

  const isCompleted = task.status === 'completed';

  const priorityColors = {
    high: { bg: theme.colors.status.error + '20', text: theme.colors.status.error },
    medium: { bg: '#FFA500' + '20', text: '#FFA500' },
    low: { bg: theme.colors.status.success + '20', text: theme.colors.status.success },
  };

  const priorityColor = task.priority ? priorityColors[task.priority] : priorityColors.medium;

  const getCategoryIcon = (category?: string | null): string => {
    switch (category) {
      case 'chores':
        return '🧹';
      case 'homework':
        return '📚';
      case 'sports':
        return '⚽';
      case 'music':
        return '🎵';
      case 'health':
        return '🏥';
      case 'social':
        return '👥';
      default:
        return '📋';
    }
  };

  return (
    <Screen>
      <Header
        title="Task Details"
        onBack={() => router.back()}
        rightAction={
          <Button
            title=""
            icon={<Trash2 size={20} color={theme.colors.text.primary} />}
            onPress={handleDelete}
            variant="ghost"
            loading={deleteTask.isPending}
          />
        }
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Title Section */}
        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.categoryIcon}>{getCategoryIcon(task.category)}</Text>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text.primary,
                  textDecorationLine: isCompleted ? 'line-through' : 'none',
                },
              ]}
            >
              {task.title}
            </Text>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.badgesSection}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
            <Text style={[styles.priorityText, { color: priorityColor.text }]}>
              {(task.priority || 'medium').toUpperCase()}
            </Text>
          </View>
          <Badge
            text={(task.status || 'pending').replace('_', ' ')}
            variant={isCompleted ? 'success' : 'neutral'}
          />
          {task.points != null && task.points > 0 && (
            <View style={[styles.pointsBadge, { backgroundColor: '#FFA500' + '20' }]}>
              <Text style={[styles.pointsText, { color: '#FFA500' }]}>
                ⭐ {task.points} points
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {task.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Description</Text>
            <Text style={[styles.descriptionText, { color: theme.colors.text.secondary }]}>
              {task.description}
            </Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Details</Text>

          {task.category && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                Category:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
              </Text>
            </View>
          )}

          {task.due_date && (
            <View style={styles.detailRow}>
              <Calendar size={16} color={theme.colors.text.secondary} />
              <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                Due Date:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                {formatDate(task.due_date)}
                {task.due_time && ` at ${task.due_time.substring(0, 5)}`}
              </Text>
            </View>
          )}

          {task.assigned_to_email && (
            <View style={styles.detailRow}>
              <User size={16} color={theme.colors.text.secondary} />
              <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                Assigned to:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                {task.assigned_to_email}
              </Text>
            </View>
          )}

          {task.assigned_by_name && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                Assigned by:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                {task.assigned_by_name}
              </Text>
            </View>
          )}

          {task.recurring && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                Recurring:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                {task.recurring_pattern || 'Yes'}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {task.notes && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Notes</Text>
            <Text style={[styles.notesText, { color: theme.colors.text.secondary }]}>
              {task.notes}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
            onPress={handleToggleStatus}
            icon={<Check size={20} color={isCompleted ? theme.colors.primary.main : '#FFFFFF'} />}
            variant={isCompleted ? 'outline' : 'primary'}
            loading={toggleStatus.isPending}
          />
          <Button
            title="Edit Task"
            onPress={() => setIsEditModalVisible(true)}
            icon={<Edit2 size={20} color={theme.colors.primary.main} />}
            variant="outline"
          />
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <TaskForm
        isVisible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSubmit={handleUpdate}
        editTask={task}
        currentUserEmail={user?.email}
        isLoading={updateTask.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  badgesSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    flex: 1,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
