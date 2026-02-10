/**
 * TaskCard Component
 * Displays a single task with checkbox, priority, assignment info, and actions
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import {
  Check,
  Calendar,
  User,
  Edit2,
  Trash2,
} from 'lucide-react-native';
// @ts-ignore
import type { Task } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/timeFormatters';

interface TaskCardProps {
  task: Task;
  onToggleStatus: (taskId: string, currentStatus: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

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

export function TaskCard({ task, onToggleStatus, onEdit, onDelete }: TaskCardProps) {
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(task.id),
      },
    ]);
  };

  const priorityColors = {
    high: { bg: theme.colors.status.error + '20', text: theme.colors.status.error },
    medium: { bg: '#FFA500' + '20', text: '#FFA500' },
    low: { bg: theme.colors.status.success + '20', text: theme.colors.status.success },
  };

  const statusColors = {
    completed: { bg: theme.colors.status.success + '20', text: theme.colors.status.success, border: theme.colors.status.success },
    in_progress: { bg: theme.colors.primary.light, text: theme.colors.primary.main, border: theme.colors.primary.main },
    cancelled: { bg: theme.colors.status.error + '20', text: theme.colors.status.error, border: theme.colors.status.error },
    pending: { bg: theme.colors.gray[300] + '20', text: theme.colors.text.secondary, border: theme.colors.gray[300] },
  };

  const priorityColor = task.priority ? priorityColors[task.priority] : priorityColors.medium;
  const statusColor = task.status
    ? statusColors[task.status]
    : statusColors.pending;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isCompleted ? theme.colors.background.secondary : theme.colors.background.primary,
          borderColor: task.priority === 'high' ? theme.colors.status.error : theme.colors.gray[300],
        },
      ]}
    >
      {/* Checkbox and Content */}
      <View style={styles.mainRow}>
        {/* Checkbox */}
        <Pressable
          onPress={() => onToggleStatus(task.id, task.status || 'pending')}
          style={[
            styles.checkbox,
            {
              borderColor: isCompleted ? theme.colors.status.success : theme.colors.gray[300],
              backgroundColor: isCompleted ? theme.colors.status.success : 'transparent',
            },
          ]}
        >
          {isCompleted && <Check size={16} color="white" />}
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.categoryIcon}>{getCategoryIcon(task.category)}</Text>
            <Text
              style={[
                styles.title,
                {
                  color: isCompleted ? theme.colors.text.secondary : theme.colors.text.primary,
                  textDecorationLine: isCompleted ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor: priorityColor.bg,
                },
              ]}
            >
              <Text style={[styles.priorityText, { color: priorityColor.text }]}>
                {task.priority || 'medium'}
              </Text>
            </View>
            {task.points != null && task.points > 0 && (
              <View style={[styles.pointsBadge, { backgroundColor: '#FFA500' + '20' }]}>
                <Text style={[styles.pointsText, { color: '#FFA500' }]}>
                  {task.points} pts
                </Text>
              </View>
            )}
          </View>

          {/* Assignment Info */}
          {task.assigned_to_email && (
            <View style={styles.assignmentRow}>
              <User size={14} color={theme.colors.text.secondary} />
              <Text style={[styles.assignmentText, { color: theme.colors.text.secondary }]}>
                Assigned to {task.assigned_to_email}
              </Text>
            </View>
          )}

          {/* Description */}
          {task.description && (
            <Text
              style={[styles.description, { color: theme.colors.text.secondary }]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          {/* Footer Info */}
          <View style={styles.footer}>
            {task.due_date && (
              <View style={styles.footerItem}>
                <Calendar size={14} color={theme.colors.text.secondary} />
                <Text style={[styles.footerText, { color: theme.colors.text.secondary }]}>
                  Due {formatDate(task.due_date)}
                  {task.due_time && ` at ${task.due_time.substring(0, 5)}`}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusColor.bg,
                  borderColor: statusColor.border,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {(task.status || 'pending').replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Notes */}
          {task.notes && (
            <Text style={[styles.notes, { color: theme.colors.text.secondary }]} numberOfLines={2}>
              {task.notes}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => onEdit(task)}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary.light }]}
          >
            <Edit2 size={16} color={theme.colors.primary.main} />
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={[styles.actionButton, { backgroundColor: theme.colors.status.error + '20' }]}
          >
            <Trash2 size={16} color={theme.colors.status.error} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIcon: {
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignmentText: {
    fontSize: 13,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerText: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  notes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  actions: {
    gap: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
