/**
 * Task Sync Service
 * Handles bidirectional synchronization with Google Tasks
 * Adapted from web app's taskSync.ts for React Native
 */

import { supabase } from '../lib/supabase';
import type { Task } from '../types/database';

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string; // RFC 3339 timestamp
  completed?: string;
  updated: string;
}

export interface TaskSyncMapping {
  id: string;
  user_id: string;
  local_task_id: string;
  google_task_id: string;
  google_task_list_id: string;
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at: string;
  local_hash: string | null;
  google_hash: string | null;
  sync_direction: 'bidirectional' | 'local_to_google' | 'google_to_local';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSyncConflict {
  id: string;
  user_id: string;
  local_task_id: string;
  google_task_id: string;
  conflict_type: 'modification' | 'deletion';
  local_task_data: Task | null;
  google_task_data: GoogleTask | null;
  local_modified_at: string | null;
  google_modified_at: string | null;
  detected_at: string;
  resolution_status: 'pending' | 'resolved' | 'ignored';
  resolution_choice: 'keep_local' | 'keep_google' | 'merge' | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface UserTaskSyncPreferences {
  user_id: string;
  sync_enabled: boolean;
  sync_frequency_minutes: number;
  sync_direction: 'bidirectional' | 'google_to_local' | 'local_to_google';
  auto_resolve_conflicts: boolean;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  google_task_list_id: string;
  created_at: string;
  updated_at: string;
}

class TaskSyncService {
  /**
   * Call Google Tasks edge function
   */
  private async callGoogleTasksEdgeFunction(action: string, data: Record<string, unknown> = {}) {
    try {
      const { data: result, error } = await supabase.functions.invoke('google-tasks', {
        body: { action, ...data },
      });

      if (error) throw error;
      return result;
    } catch (error: unknown) {
      console.error(`Error calling Google Tasks edge function (${action}):`, error);
      throw error;
    }
  }

  /**
   * Generate a simple hash for task data (for conflict detection)
   */
  private generateTaskHash(task: Task | GoogleTask): string {
    if ('due_date' in task) {
      // Local task
      const data = {
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        due_time: task.due_time,
        status: task.status,
        priority: task.priority,
        category: task.category,
      };
      return this.simpleHash(JSON.stringify(data));
    }

    // Google task
    const googleTask = task as GoogleTask;
    const data = {
      title: googleTask.title,
      notes: googleTask.notes,
      due: googleTask.due,
      status: googleTask.status,
    };
    return this.simpleHash(JSON.stringify(data));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Convert Google Task to local task format
   */
  googleTaskToLocal(googleTask: GoogleTask, userId: string): Partial<Task> {
    let due_date = null;
    let due_time = null;

    if (googleTask.due) {
      const dueDate = new Date(googleTask.due);
      due_date = dueDate.toISOString().split('T')[0];
      const hours = dueDate.getUTCHours();
      const minutes = dueDate.getUTCMinutes();
      if (hours !== 23 || minutes !== 59) {
        due_time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      }
    }

    return {
      user_id: userId,
      title: googleTask.title || 'Untitled Task',
      description: googleTask.notes || null,
      due_date,
      due_time,
      status: googleTask.status === 'completed' ? 'completed' : 'pending',
      priority: 'medium',
      category: 'other',
    };
  }

  /**
   * Convert local task to Google Task format
   */
  localTaskToGoogle(localTask: Task): {
    title: string;
    notes?: string;
    due?: string;
    status?: 'needsAction' | 'completed';
  } {
    const googleTask: {
      title: string;
      notes?: string;
      due?: string;
      status?: 'needsAction' | 'completed';
    } = {
      title: localTask.title,
    };

    if (localTask.description) {
      googleTask.notes = localTask.description;
    }

    if (localTask.due_date) {
      const dueDate = new Date(localTask.due_date);
      if (localTask.due_time) {
        const [hours = '0', minutes = '0'] = localTask.due_time.split(':');
        dueDate.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      } else {
        dueDate.setUTCHours(23, 59, 59, 999);
      }
      googleTask.due = dueDate.toISOString();
    }

    if (localTask.status === 'completed') {
      googleTask.status = 'completed';
    } else if (localTask.status === 'pending' || localTask.status === 'in_progress') {
      googleTask.status = 'needsAction';
    }

    return googleTask;
  }

  /**
   * Get user's task sync preferences
   */
  async getUserTaskSyncPreferences(userId: string): Promise<UserTaskSyncPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_task_sync_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching task sync preferences:', error);
        return null;
      }

      if (!data) {
        // Create default preferences
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_task_sync_preferences')
          .insert([
            {
              user_id: userId,
              sync_enabled: true,
              sync_frequency_minutes: 15,
              sync_direction: 'bidirectional',
              auto_resolve_conflicts: false,
              google_task_list_id: '@default',
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating task sync preferences:', insertError);
          return null;
        }

        return newPrefs as UserTaskSyncPreferences;
      }

      return data as UserTaskSyncPreferences;
    } catch (error) {
      console.error('Error in getUserTaskSyncPreferences:', error);
      return null;
    }
  }

  /**
   * Update user's task sync preferences
   */
  async updateUserTaskSyncPreferences(
    userId: string,
    updates: Partial<UserTaskSyncPreferences>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_task_sync_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating task sync preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserTaskSyncPreferences:', error);
      return false;
    }
  }

  /**
   * Sync a single task to Google Tasks
   */
  async syncTaskToGoogle(taskId: string, userId: string): Promise<boolean> {
    try {
      // Get the local task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

      if (taskError || !task) {
        console.error('Task not found:', taskError);
        return false;
      }

      // Check if task is already mapped to Google
      const { data: mapping } = await supabase
        .from('task_sync_mappings')
        .select('*')
        .eq('local_task_id', taskId)
        .eq('user_id', userId)
        .maybeSingle();

      const googleTaskData = this.localTaskToGoogle(task as Task);

      if (mapping) {
        // Update existing Google Task
        await this.callGoogleTasksEdgeFunction('updateTask', {
          taskListId: mapping.google_task_list_id,
          taskId: mapping.google_task_id,
          task: googleTaskData,
        });

        // Update mapping
        await supabase
          .from('task_sync_mappings')
          .update({
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            local_hash: this.generateTaskHash(task as Task),
            updated_at: new Date().toISOString(),
          })
          .eq('id', mapping.id);
      } else {
        // Create new Google Task
        const result = await this.callGoogleTasksEdgeFunction('insertTask', {
          task: googleTaskData,
        });

        // Create mapping
        await supabase.from('task_sync_mappings').insert([
          {
            user_id: userId,
            local_task_id: taskId,
            google_task_id: result.id,
            google_task_list_id: result.taskListId || '@default',
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            local_hash: this.generateTaskHash(task as Task),
            google_hash: this.generateTaskHash(result),
            sync_direction: 'bidirectional',
          },
        ]);
      }

      return true;
    } catch (error) {
      console.error('Error syncing task to Google:', error);
      return false;
    }
  }

  /**
   * List all Google Tasks
   */
  async listGoogleTasks(taskListId: string = '@default'): Promise<GoogleTask[]> {
    try {
      const result = await this.callGoogleTasksEdgeFunction('listTasks', {
        taskListId,
        maxResults: 100,
        showCompleted: false,
      });

      return result.items || [];
    } catch (error) {
      console.error('Error listing Google Tasks:', error);
      return [];
    }
  }

  /**
   * Get pending sync conflicts
   */
  async getPendingTaskConflicts(userId: string): Promise<TaskSyncConflict[]> {
    try {
      const { data, error } = await supabase
        .from('task_sync_conflicts')
        .select('*')
        .eq('user_id', userId)
        .eq('resolution_status', 'pending')
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending task conflicts:', error);
        return [];
      }

      return (data || []) as TaskSyncConflict[];
    } catch (error: unknown) {
      console.error('Error in getPendingTaskConflicts:', error);
      return [];
    }
  }

  /**
   * Resolve a sync conflict
   */
  async resolveTaskConflict(
    conflictId: string,
    resolution: 'keep_local' | 'keep_google' | 'merge',
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('task_sync_conflicts')
        .update({
          resolution_status: 'resolved',
          resolution_choice: resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
        })
        .eq('id', conflictId);

      if (error) {
        console.error('Error resolving task conflict:', error);
        return false;
      }

      return true;
    } catch (error: unknown) {
      console.error('Error in resolveTaskConflict:', error);
      return false;
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(userId: string): Promise<Date | null> {
    try {
      const prefs = await this.getUserTaskSyncPreferences(userId);
      if (prefs?.last_sync_at) {
        return new Date(prefs.last_sync_at);
      }
      return null;
    } catch (error: unknown) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }
}

export const taskSyncService = new TaskSyncService();
