/**
 * Task Service
 * Handles CRUD operations for tasks in the local Supabase database
 */

import { supabase } from '../lib/supabase';
import type { Task } from '../types/database';

export interface TaskFilters {
  status?: Task['status'];
  priority?: Task['priority'];
  category?: string;
  assignedTo?: string; // email
  search?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  assigned_to_email?: string;
  assigned_by_name?: string;
  due_date?: string;
  due_time?: string;
  recurring?: boolean;
  recurring_pattern?: string;
  points?: number;
  notes?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
}

class TaskService {
  /**
   * Get tasks for the current user with optional filters
   */
  async getTasks(userId: string, filters?: TaskFilters): Promise<Task[]> {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to_email', filters.assignedTo);
      }
      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Task[];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId: string, userId: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data as Task | null;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    try {
      const taskData = {
        user_id: userId,
        title: input.title,
        description: input.description || null,
        category: input.category || 'other',
        priority: input.priority || 'medium',
        status: 'pending' as const,
        assigned_to_email: input.assigned_to_email || null,
        assigned_by_name: input.assigned_by_name || null,
        due_date: input.due_date || null,
        due_time: input.due_time || null,
        recurring: input.recurring || false,
        recurring_pattern: input.recurring_pattern || null,
        points: input.points || 0,
        notes: input.notes || null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      return data as Task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    userId: string,
    updates: UpdateTaskInput
  ): Promise<Task> {
    try {
      const updateData: Partial<Task> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Set completed_at when marking as completed
      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      // Clear completed_at if not completed
      if (updates.status && updates.status !== 'completed') {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as Task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Toggle task status between pending and completed
   */
  async toggleTaskStatus(
    taskId: string,
    userId: string,
    currentStatus?: string
  ): Promise<Task> {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    return this.updateTask(taskId, userId, { status: newStatus });
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Assign a task to a family member
   */
  async assignTask(
    taskId: string,
    userId: string,
    assigneeEmail: string,
    assignerName?: string
  ): Promise<Task> {
    return this.updateTask(taskId, userId, {
      assigned_to_email: assigneeEmail,
      assigned_by_name: assignerName,
    });
  }

  /**
   * Get tasks assigned to a specific family member
   */
  async getTasksByAssignee(userId: string, assigneeEmail: string): Promise<Task[]> {
    return this.getTasks(userId, { assignedTo: assigneeEmail });
  }

  /**
   * Get task statistics
   */
  async getTaskStats(userId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    totalPoints: number;
  }> {
    try {
      const tasks = await this.getTasks(userId);

      const stats = {
        total: tasks.length,
        pending: tasks.filter((t) => t.status === 'pending').length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        totalPoints: tasks
          .filter((t) => t.status === 'completed')
          .reduce((sum, t) => sum + (t.points || 0), 0),
      };

      return stats;
    } catch (error) {
      console.error('Error getting task stats:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService();
