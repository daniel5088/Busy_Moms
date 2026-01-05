import { supabase } from '../lib/supabase';
import type { Task } from '../lib/supabase';
import { googleTasksService, GoogleTask } from './googleTasks';

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
  local_task_data: any;
  google_task_data: any;
  local_modified_at: string | null;
  google_modified_at: string | null;
  detected_at: string;
  resolution_status: 'pending' | 'resolved' | 'ignored';
  resolution_choice: 'keep_local' | 'keep_google' | 'merge' | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface TaskSyncLog {
  id: string;
  user_id: string;
  sync_operation: 'full_sync' | 'task_create' | 'task_update' | 'task_delete';
  sync_direction: 'local_to_google' | 'google_to_local' | 'bidirectional';
  status: 'in_progress' | 'completed' | 'failed';
  tasks_processed: number;
  tasks_created: number;
  tasks_updated: number;
  tasks_deleted: number;
  conflicts_detected: number;
  error_count: number;
  error_details: any;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
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

export class TaskSyncService {
  generateTaskHash(task: Task | GoogleTask): string {
    if ('due_date' in task) {
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

    const data = {
      title: task.title,
      notes: task.notes,
      due: task.due,
      status: task.status,
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

  localTaskToGoogle(localTask: Task): {
    title: string;
    notes?: string;
    due?: string;
    status?: 'needsAction' | 'completed';
  } {
    const googleTask: any = {
      title: localTask.title,
    };

    if (localTask.description) {
      googleTask.notes = localTask.description;
    }

    if (localTask.due_date) {
      const dueDate = new Date(localTask.due_date);
      if (localTask.due_time) {
        const [hours, minutes] = localTask.due_time.split(':');
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

  async createTaskSyncLog(
    userId: string,
    operation: TaskSyncLog['sync_operation'],
    direction: TaskSyncLog['sync_direction']
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('task_sync_logs')
        .insert([
          {
            user_id: userId,
            sync_operation: operation,
            sync_direction: direction,
            status: 'in_progress',
            tasks_processed: 0,
            tasks_created: 0,
            tasks_updated: 0,
            tasks_deleted: 0,
            conflicts_detected: 0,
            error_count: 0,
            started_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating task sync log:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in createTaskSyncLog:', error);
      return null;
    }
  }

  async updateTaskSyncLog(logId: string, updates: Partial<TaskSyncLog>): Promise<boolean> {
    try {
      const { error } = await supabase.from('task_sync_logs').update(updates).eq('id', logId);

      if (error) {
        console.error('Error updating task sync log:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTaskSyncLog:', error);
      return false;
    }
  }

  async getTaskSyncMappings(userId: string): Promise<TaskSyncMapping[]> {
    try {
      const { data, error } = await supabase
        .from('task_sync_mappings')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching task sync mappings:', error);
        return [];
      }

      return data as TaskSyncMapping[];
    } catch (error) {
      console.error('Error in getTaskSyncMappings:', error);
      return [];
    }
  }

  async getTaskSyncMappingByLocalId(
    userId: string,
    localTaskId: string
  ): Promise<TaskSyncMapping | null> {
    try {
      const { data, error } = await supabase
        .from('task_sync_mappings')
        .select('*')
        .eq('user_id', userId)
        .eq('local_task_id', localTaskId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching task sync mapping:', error);
        return null;
      }

      return data as TaskSyncMapping | null;
    } catch (error) {
      console.error('Error in getTaskSyncMappingByLocalId:', error);
      return null;
    }
  }

  async getTaskSyncMappingByGoogleId(
    userId: string,
    googleTaskId: string
  ): Promise<TaskSyncMapping | null> {
    try {
      const { data, error } = await supabase
        .from('task_sync_mappings')
        .select('*')
        .eq('user_id', userId)
        .eq('google_task_id', googleTaskId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching task sync mapping:', error);
        return null;
      }

      return data as TaskSyncMapping | null;
    } catch (error) {
      console.error('Error in getTaskSyncMappingByGoogleId:', error);
      return null;
    }
  }

  async upsertTaskSyncMapping(mapping: Partial<TaskSyncMapping>): Promise<boolean> {
    try {
      const { error } = await supabase.from('task_sync_mappings').upsert(
        {
          ...mapping,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,google_task_id',
        }
      );

      if (error) {
        console.error('Error upserting task sync mapping:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in upsertTaskSyncMapping:', error);
      return false;
    }
  }

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

      return data as TaskSyncConflict[];
    } catch (error) {
      console.error('Error in getPendingTaskConflicts:', error);
      return [];
    }
  }

  async createTaskConflict(conflict: Partial<TaskSyncConflict>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('task_sync_conflicts')
        .insert([
          {
            ...conflict,
            detected_at: new Date().toISOString(),
            resolution_status: 'pending',
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating task conflict:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in createTaskConflict:', error);
      return null;
    }
  }

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
    } catch (error) {
      console.error('Error in resolveTaskConflict:', error);
      return false;
    }
  }
}

export const taskSyncService = new TaskSyncService();
