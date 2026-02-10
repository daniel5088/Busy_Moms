/**
 * TaskList Component
 * Displays a filterable list of tasks with status tabs and family member filter
 */

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { Check, Clock, Award, Filter, Target } from 'lucide-react-native';
// @ts-ignore
import type { Task, FamilyMember } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';
import { TaskCard } from './TaskCard';
import { EmptyState } from '../ui/EmptyState';
import { Select } from '../ui/Select';

interface TaskListProps {
  tasks: Task[];
  familyMembers?: FamilyMember[];
  onToggleStatus: (taskId: string, currentStatus: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type StatusTab = 'all' | 'pending' | 'in_progress' | 'completed';

const STATUS_TABS = [
  { id: 'all', label: 'All Tasks', icon: Check },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'in_progress', label: 'In Progress', icon: Target },
  { id: 'completed', label: 'Completed', icon: Award },
] as const;

export function TaskList({
  tasks,
  familyMembers = [],
  onToggleStatus,
  onEdit,
  onDelete,
  onRefresh,
  isRefreshing,
}: TaskListProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Filter by status tab
    if (activeTab !== 'all' && task.status !== activeTab) {
      return false;
    }

    // Filter by family member
    if (selectedMember !== 'all') {
      if (selectedMember === 'unassigned') {
        return !task.assigned_to_email;
      }
      return task.assigned_to_email === selectedMember;
    }

    return true;
  });

  // Prepare family member options for filter
  const memberOptions = [
    { label: 'All Family Members', value: 'all' },
    { label: 'Unassigned', value: 'unassigned' },
    ...familyMembers.map((member) => ({
      label: member.Email || member.name,
      value: member.Email || member.id,
    })),
  ];

  return (
    <View style={styles.container}>
      {/* Status Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.colors.gray[300] }]}>
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id as StatusTab)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? theme.colors.background.secondary : 'transparent',
                },
              ]}
            >
              <Icon size={16} color={isActive ? theme.colors.primary.main : theme.colors.text.secondary} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.colors.primary.main : theme.colors.text.secondary,
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Family Member Filter */}
      {familyMembers.length > 0 && (
        <View style={styles.filterRow}>
          <Filter size={16} color={theme.colors.text.secondary} />
          <View style={styles.selectContainer}>
            <Select
              value={selectedMember}
              onChange={setSelectedMember}
              options={memberOptions}
            />
          </View>
        </View>
      )}

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggleStatus={onToggleStatus}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        ListEmptyComponent={
          <EmptyState
            icon={<Check size={48} color={theme.colors.text.secondary} />}
            title={
              activeTab === 'all' ? 'No tasks yet' : `No ${activeTab.replace('_', ' ')} tasks`
            }
            description={
              activeTab === 'all'
                ? 'Create your first task to get started'
                : `No tasks with ${activeTab.replace('_', ' ')} status`
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
    marginBottom: 12,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  selectContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
});
