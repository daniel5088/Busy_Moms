import { supabase } from '../lib/supabase';

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string; // RFC 3339 timestamp
  completed?: string;
  updated: string;
}

class GoogleTasksService {
  private async callEdgeFunction(action: string, data: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('google-tasks', {
      body: { action, ...data },
    });

    if (error) throw error;
    return result;
  }

  async insertTask(task: {
    title: string;
    notes?: string;
    due?: string;
  }): Promise<GoogleTask & { taskListId: string }> {
    const googleTask: any = {
      title: task.title,
    };

    if (task.notes) {
      googleTask.notes = task.notes;
    }

    if (task.due) {
      // Convert YYYY-MM-DD to RFC 3339 format (end of day UTC)
      const dueDate = new Date(task.due);
      dueDate.setUTCHours(23, 59, 59, 999);
      googleTask.due = dueDate.toISOString();
    }

    return await this.callEdgeFunction('insertTask', { task: googleTask });
  }

  async updateTask(
    taskListId: string,
    taskId: string,
    updates: {
      title?: string;
      notes?: string;
      status?: 'needsAction' | 'completed';
      due?: string;
    }
  ): Promise<GoogleTask> {
    const googleTask: any = {};

    if (updates.title) {
      googleTask.title = updates.title;
    }

    if (updates.notes !== undefined) {
      googleTask.notes = updates.notes || '';
    }

    if (updates.status) {
      googleTask.status = updates.status;
    }

    if (updates.due !== undefined) {
      if (updates.due) {
        const dueDate = new Date(updates.due);
        dueDate.setUTCHours(23, 59, 59, 999);
        googleTask.due = dueDate.toISOString();
      } else {
        googleTask.due = null;
      }
    }

    return await this.callEdgeFunction('updateTask', {
      taskListId,
      taskId,
      task: googleTask,
    });
  }

  async deleteTask(taskListId: string, taskId: string): Promise<{ success: boolean }> {
    return await this.callEdgeFunction('deleteTask', {
      taskListId,
      taskId,
    });
  }

  async listTasks(
    taskListId: string = '@default',
    options: { maxResults?: number; showCompleted?: boolean } = {}
  ): Promise<{ items: GoogleTask[] }> {
    return await this.callEdgeFunction('listTasks', {
      taskListId,
      maxResults: options.maxResults || 100,
      showCompleted: options.showCompleted || false,
    });
  }
}

export const googleTasksService = new GoogleTasksService();