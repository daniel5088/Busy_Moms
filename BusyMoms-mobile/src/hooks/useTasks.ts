/**
 * useTasks Hook
 * React Query hook for task management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  taskService,
  type TaskFilters,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '../services/taskService';
import { taskSyncService } from '../services/taskSyncService';

const TASKS_QUERY_KEY = 'tasks';

export function useTasks(userId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, userId, filters],
    queryFn: () => taskService.getTasks(userId, filters),
    enabled: !!userId,
  });
}

export function useTask(taskId: string, userId: string) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, taskId, userId],
    queryFn: () => taskService.getTaskById(taskId, userId),
    enabled: !!taskId && !!userId,
  });
}

export function useTaskStats(userId: string) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, 'stats', userId],
    queryFn: () => taskService.getTaskStats(userId),
    enabled: !!userId,
  });
}

export function useCreateTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => taskService.createTask(userId, input),
    onSuccess: (newTask) => {
      // Invalidate tasks query to refetch
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });

      // Optionally sync to Google Tasks
      taskSyncService.syncTaskToGoogle(newTask.id, userId).catch((err) => {
        console.error('Failed to sync task to Google:', err);
      });
    },
  });
}

export function useUpdateTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: UpdateTaskInput }) =>
      taskService.updateTask(taskId, userId, updates),
    onSuccess: (updatedTask) => {
      // Invalidate tasks queries
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });

      // Optionally sync to Google Tasks
      taskSyncService.syncTaskToGoogle(updatedTask.id, userId).catch((err) => {
        console.error('Failed to sync task to Google:', err);
      });
    },
  });
}

export function useToggleTaskStatus(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, currentStatus }: { taskId: string; currentStatus?: string }) =>
      taskService.toggleTaskStatus(taskId, userId, currentStatus),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });

      // Optionally sync to Google Tasks
      taskSyncService.syncTaskToGoogle(updatedTask.id, userId).catch((err) => {
        console.error('Failed to sync task to Google:', err);
      });
    },
  });
}

export function useDeleteTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskService.deleteTask(taskId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });
}

export function useAssignTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      assigneeEmail,
      assignerName,
    }: {
      taskId: string;
      assigneeEmail: string;
      assignerName?: string;
    }) => taskService.assignTask(taskId, userId, assigneeEmail, assignerName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });
}

export function useTaskSyncPreferences(userId: string) {
  return useQuery({
    queryKey: ['task-sync-preferences', userId],
    queryFn: () => taskSyncService.getUserTaskSyncPreferences(userId),
    enabled: !!userId,
  });
}

export function useTaskSyncConflicts(userId: string) {
  return useQuery({
    queryKey: ['task-sync-conflicts', userId],
    queryFn: () => taskSyncService.getPendingTaskConflicts(userId),
    enabled: !!userId,
  });
}

export function useResolveTaskConflict(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conflictId,
      resolution,
    }: {
      conflictId: string;
      resolution: 'keep_local' | 'keep_google' | 'merge';
    }) => taskSyncService.resolveTaskConflict(conflictId, resolution, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-sync-conflicts'] });
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });
}
