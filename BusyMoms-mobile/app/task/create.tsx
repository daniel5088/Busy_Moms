/**
 * Create Task Screen
 * Screen for creating a new task
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateTask } from '../../src/hooks/useTasks';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { TaskForm } from '../../src/components/tasks/TaskForm';
import { supabase } from '../../src/lib/supabase';
import type { FamilyMember } from '../../src/types/database';
import type { CreateTaskInput, UpdateTaskInput } from '../../src/services/taskService';

export default function CreateTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const createTask = useCreateTask(user?.id || '');

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Load family members
  useEffect(() => {
    if (user) {
      loadFamilyMembers();
    }
  }, [user]);

  const loadFamilyMembers = async () => {
    if (!user?.id) return;

    try {
      const { data: members, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (!error && members) {
        setFamilyMembers(members);
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  const handleSubmit = async (data: CreateTaskInput | UpdateTaskInput) => {
    try {
      await createTask.mutateAsync(data as CreateTaskInput);
      router.back();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  return (
    <Screen>
      <Header title="Create Task" onBack={() => router.back()} />
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <TaskForm
          isVisible={true}
          onClose={() => router.back()}
          onSubmit={handleSubmit}
          familyMembers={familyMembers}
          currentUserEmail={user?.email}
          isLoading={createTask.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
