import React from 'react';
import { User, UserCheck } from 'lucide-react';
import { Task, FamilyMember } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface TaskAssignmentDisplayProps {
  task: Task;
  familyMembers: FamilyMember[];
}

export function TaskAssignmentDisplay({ task, familyMembers }: TaskAssignmentDisplayProps) {
  const { user } = useAuth();
  
  // Check if current user is the creator
  const isCreator = user?.id === task.user_id;
  
  // Check if current user is the assignee
  const isAssignee = user?.email === task.assigned_to_email;
  
  // Find the assigned person's name from family members
  const assignedPerson = familyMembers.find(
    member => member.Email === task.assigned_to_email
  );
  
  // Find the creator's name from family members (for when assignee views it)
  const creator = familyMembers.find(
    member => member.id === task.user_id
  );
  
  // If task is not assigned to anyone, don't show anything
  if (!task.assigned_to_email) {
    return null;
  }
  
  return (
    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
      {isCreator && !isAssignee ? (
        // Creator view: "Assigned to [Name]"
        <>
          <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span>
            Assigned to{' '}
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {assignedPerson?.name || task.assigned_to_email}
            </span>
          </span>
        </>
      ) : isAssignee ? (
        // Assignee view: "Assigned by [Name]"
        <>
          <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span>
            Assigned by{' '}
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {task.assigned_by_name || creator?.name || 'Unknown'}
            </span>
          </span>
        </>
      ) : null}
    </div>
  );
}