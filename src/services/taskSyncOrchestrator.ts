import { supabase } from '../lib/supabase';
import type { Task } from '../lib/supabase';
import { googleTasksService, GoogleTask } from './googleTasks';
import { taskSyncService } from './taskSync';

export interface TaskSyncResult {
  success: boolean;
  logId: string;
  tasksProcessed: number;
  tasksCreated: number;
  tasksUpdated: number;
  tasksDeleted: number;
  conflictsDetected: number;
  errors: string[];
}

export class TaskSyncOrchestrator {
  private syncInProgress = false;

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  async performFullSync(userId: string): Promise<TaskSyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        logId: '',
        tasksProcessed: 0,
        tasksCreated: 0,
        tasksUpdated: 0,
        tasksDeleted: 0,
        conflictsDetected: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    let logId: string | null = null;

    const result: TaskSyncResult = {
      success: false,
      logId: '',
      tasksProcessed: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      conflictsDetected: 0,
      errors: [],
    };

    try {
      console.log('🔄 Starting full task sync for user:', userId);

      const prefs = await taskSyncService.getUserTaskSyncPreferences(userId);
      if (!prefs || !prefs.sync_enabled) {
        result.errors.push('Task sync is disabled for this user');
        return result;
      }

      logId = await taskSyncService.createTaskSyncLog(userId, 'full_sync', prefs.sync_direction);
      if (!logId) {
        result.errors.push('Failed to create sync log');
        return result;
      }
      result.logId = logId;

      const { data: localTasks, error: localError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'cancelled');

      if (localError) {
        result.errors.push(`Failed to fetch local tasks: ${localError.message}`);
        return result;
      }

      let googleTasks: GoogleTask[] = [];
      try {
        const tasksResponse = await googleTasksService.listTasks(prefs.google_task_list_id, {
          maxResults: 100,
          showCompleted: true,
        });
        googleTasks = tasksResponse.items || [];
      } catch (error) {
        console.error('Failed to fetch Google Tasks:', error);
        result.errors.push(`Failed to fetch Google Tasks: ${error}`);
        return result;
      }

      console.log(
        `📊 Found ${localTasks?.length || 0} local tasks and ${googleTasks.length} Google tasks`
      );

      const mappings = await taskSyncService.getTaskSyncMappings(userId);
      const mappingsByLocalId = new Map(mappings.map((m) => [m.local_task_id, m]));
      const mappingsByGoogleId = new Map(mappings.map((m) => [m.google_task_id, m]));

      if (prefs.sync_direction === 'bidirectional' || prefs.sync_direction === 'google_to_local') {
        const googleResult = await this.syncGoogleToLocal(
          userId,
          googleTasks,
          localTasks || [],
          mappingsByGoogleId,
          prefs.google_task_list_id
        );
        result.tasksCreated += googleResult.created;
        result.tasksUpdated += googleResult.updated;
        result.conflictsDetected += googleResult.conflicts;
        result.errors.push(...googleResult.errors);
      }

      if (prefs.sync_direction === 'bidirectional' || prefs.sync_direction === 'local_to_google') {
        const localResult = await this.syncLocalToGoogle(
          userId,
          localTasks || [],
          googleTasks,
          mappingsByLocalId,
          prefs.google_task_list_id
        );
        result.tasksCreated += localResult.created;
        result.tasksUpdated += localResult.updated;
        result.conflictsDetected += localResult.conflicts;
        result.errors.push(...localResult.errors);
      }

      result.tasksProcessed = (localTasks?.length || 0) + googleTasks.length;
      result.success = result.errors.length === 0;

      await taskSyncService.updateUserTaskSyncPreferences(userId, {
        last_sync_at: new Date().toISOString(),
        last_successful_sync_at: result.success
          ? new Date().toISOString()
          : prefs.last_successful_sync_at,
      });

      const duration = Date.now() - startTime;
      await taskSyncService.updateTaskSyncLog(logId, {
        status: result.success ? 'completed' : 'failed',
        tasks_processed: result.tasksProcessed,
        tasks_created: result.tasksCreated,
        tasks_updated: result.tasksUpdated,
        tasks_deleted: result.tasksDeleted,
        conflicts_detected: result.conflictsDetected,
        error_count: result.errors.length,
        error_details: result.errors.length > 0 ? { errors: result.errors } : null,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      });

      console.log('✅ Task sync completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Task sync failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');

      if (logId) {
        await taskSyncService.updateTaskSyncLog(logId, {
          status: 'failed',
          error_count: result.errors.length,
          error_details: { errors: result.errors },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        });
      }

      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncGoogleToLocal(
    userId: string,
    googleTasks: GoogleTask[],
    localTasks: Task[],
    mappingsByGoogleId: Map<string, any>,
    taskListId: string
  ): Promise<{ created: number; updated: number; conflicts: number; errors: string[] }> {
    const result = { created: 0, updated: 0, conflicts: 0, errors: [] as string[] };

    for (const googleTask of googleTasks) {
      if (!googleTask.id) continue;

      try {
        const mapping = mappingsByGoogleId.get(googleTask.id);

        if (!mapping) {
          const localTaskData = taskSyncService.googleTaskToLocal(googleTask, userId);
          const { data: newTask, error } = await supabase
            .from('tasks')
            .insert([localTaskData])
            .select()
            .single();

          if (error) {
            result.errors.push(`Failed to create local task: ${error.message}`);
            continue;
          }

          await taskSyncService.upsertTaskSyncMapping({
            user_id: userId,
            local_task_id: newTask.id,
            google_task_id: googleTask.id,
            google_task_list_id: taskListId,
            sync_status: 'synced',
            local_hash: taskSyncService.generateTaskHash(newTask),
            google_hash: taskSyncService.generateTaskHash(googleTask),
            last_synced_at: new Date().toISOString(),
          });

          result.created++;
          console.log(`✅ Created local task from Google: ${googleTask.title}`);
        } else {
          const currentGoogleHash = taskSyncService.generateTaskHash(googleTask);

          if (currentGoogleHash !== mapping.google_hash) {
            const { data: localTask, error: fetchError } = await supabase
              .from('tasks')
              .select('*')
              .eq('id', mapping.local_task_id)
              .maybeSingle();

            if (fetchError || !localTask) {
              result.errors.push(`Failed to fetch local task: ${mapping.local_task_id}`);
              continue;
            }

            const currentLocalHash = taskSyncService.generateTaskHash(localTask);

            if (currentLocalHash !== mapping.local_hash) {
              console.log('⚠️ Task conflict detected:', googleTask.title);

              await taskSyncService.createTaskConflict({
                user_id: userId,
                local_task_id: mapping.local_task_id,
                google_task_id: googleTask.id,
                conflict_type: 'modification',
                local_task_data: localTask,
                google_task_data: googleTask,
                local_modified_at: localTask.updated_at,
                google_modified_at: googleTask.updated,
              });

              result.conflicts++;
            } else {
              const localTaskData = taskSyncService.googleTaskToLocal(googleTask, userId);

              const updateData: any = { ...localTaskData };
              if (localTask.status === 'in_progress' && googleTask.status === 'needsAction') {
                delete updateData.status;
              }

              const { error: updateError } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', mapping.local_task_id);

              if (updateError) {
                result.errors.push(`Failed to update local task: ${updateError.message}`);
                continue;
              }

              await taskSyncService.upsertTaskSyncMapping({
                ...mapping,
                local_hash: currentGoogleHash,
                google_hash: currentGoogleHash,
                last_synced_at: new Date().toISOString(),
                sync_status: 'synced',
              });

              result.updated++;
              console.log(`✅ Updated local task from Google: ${googleTask.title}`);
            }
          }
        }
      } catch (error) {
        result.errors.push(`Error processing Google task ${googleTask.id}: ${error}`);
      }
    }

    return result;
  }

  private async syncLocalToGoogle(
    userId: string,
    localTasks: Task[],
    googleTasks: GoogleTask[],
    mappingsByLocalId: Map<string, any>,
    taskListId: string
  ): Promise<{ created: number; updated: number; conflicts: number; errors: string[] }> {
    const result = { created: 0, updated: 0, conflicts: 0, errors: [] as string[] };

    const googleTasksById = new Map(googleTasks.map((t) => [t.id!, t]));

    for (const localTask of localTasks) {
      if (localTask.status === 'cancelled') continue;

      try {
        const mapping = mappingsByLocalId.get(localTask.id);

        if (!mapping) {
          const googleTaskData = taskSyncService.localTaskToGoogle(localTask);

          try {
            const createdGoogleTask = await googleTasksService.insertTask(googleTaskData);

            await taskSyncService.upsertTaskSyncMapping({
              user_id: userId,
              local_task_id: localTask.id,
              google_task_id: createdGoogleTask.id,
              google_task_list_id: createdGoogleTask.taskListId || taskListId,
              sync_status: 'synced',
              local_hash: taskSyncService.generateTaskHash(localTask),
              google_hash: taskSyncService.generateTaskHash(createdGoogleTask),
              last_synced_at: new Date().toISOString(),
            });

            result.created++;
            console.log(`✅ Created Google task from local: ${localTask.title}`);
          } catch (error) {
            result.errors.push(`Failed to create Google task: ${error}`);
          }
        } else {
          const currentLocalHash = taskSyncService.generateTaskHash(localTask);

          if (currentLocalHash !== mapping.local_hash) {
            const googleTask = googleTasksById.get(mapping.google_task_id);

            if (!googleTask) {
              result.errors.push(`Google task not found: ${mapping.google_task_id}`);
              continue;
            }

            const currentGoogleHash = taskSyncService.generateTaskHash(googleTask);

            if (currentGoogleHash !== mapping.google_hash) {
              continue;
            } else {
              const googleTaskData = taskSyncService.localTaskToGoogle(localTask);

              try {
                const updatedGoogleTask = await googleTasksService.updateTask(
                  mapping.google_task_list_id,
                  mapping.google_task_id,
                  googleTaskData
                );

                await taskSyncService.upsertTaskSyncMapping({
                  ...mapping,
                  local_hash: currentLocalHash,
                  google_hash: taskSyncService.generateTaskHash(updatedGoogleTask),
                  last_synced_at: new Date().toISOString(),
                  sync_status: 'synced',
                });

                result.updated++;
                console.log(`✅ Updated Google task from local: ${localTask.title}`);
              } catch (error) {
                result.errors.push(`Failed to update Google task: ${error}`);
              }
            }
          }
        }
      } catch (error) {
        result.errors.push(`Error processing local task ${localTask.id}: ${error}`);
      }
    }

    return result;
  }

  async syncSingleTask(
    userId: string,
    taskId: string,
    direction: 'local_to_google' | 'google_to_local'
  ): Promise<boolean> {
    try {
      console.log(`🔄 Syncing single task: ${taskId}, direction: ${direction}`);

      if (direction === 'local_to_google') {
        const { data: localTask, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .single();

        if (error || !localTask) {
          console.error('Failed to fetch local task:', error);
          return false;
        }

        if (localTask.status === 'cancelled') {
          console.log('Task is cancelled, skipping sync');
          return true;
        }

        const prefs = await taskSyncService.getUserTaskSyncPreferences(userId);
        if (!prefs || !prefs.sync_enabled) {
          console.log('Task sync is disabled');
          return false;
        }

        const mapping = await taskSyncService.getTaskSyncMappingByLocalId(userId, taskId);

        if (mapping) {
          const googleTaskData = taskSyncService.localTaskToGoogle(localTask);
          await googleTasksService.updateTask(
            mapping.google_task_list_id,
            mapping.google_task_id,
            googleTaskData
          );

          await taskSyncService.upsertTaskSyncMapping({
            ...mapping,
            local_hash: taskSyncService.generateTaskHash(localTask),
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
          });
        } else {
          const googleTaskData = taskSyncService.localTaskToGoogle(localTask);
          const createdTask = await googleTasksService.insertTask(googleTaskData);

          await taskSyncService.upsertTaskSyncMapping({
            user_id: userId,
            local_task_id: taskId,
            google_task_id: createdTask.id,
            google_task_list_id: createdTask.taskListId || prefs.google_task_list_id,
            sync_status: 'synced',
            local_hash: taskSyncService.generateTaskHash(localTask),
            google_hash: taskSyncService.generateTaskHash(createdTask),
            last_synced_at: new Date().toISOString(),
          });
        }

        console.log('✅ Single task synced successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to sync single task:', error);
      return false;
    }
  }
}

export const taskSyncOrchestrator = new TaskSyncOrchestrator();
