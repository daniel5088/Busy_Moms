import React from 'react';
import { Event, ShoppingItem, Reminder } from '../../lib/supabase';
import { formatEventTime, formatDate } from '../../utils/timeFormatters';
import { User } from 'lucide-react';

interface DashboardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  loadingColor?: string;
}

/**
 * Generic popup component for dashboard modals
 */
export function DashboardPopup({
  isOpen,
  onClose,
  title,
  children,
  loading = false,
  loadingColor = 'border-purple-500',
}: DashboardPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className={`animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 ${loadingColor}`}
              ></div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

interface EventsListProps {
  events: Event[];
  emptyMessage?: string;
}

/**
 * List component for displaying events in a popup
 */
export function EventsList({ events, emptyMessage = 'No upcoming events' }: EventsListProps) {
  if (events.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-8">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
            {event.title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {formatDate(event.event_date)}
            {event.start_time && ` at ${formatEventTime(event.start_time)}`}
          </p>
          {event.location && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{event.location}</p>
          )}
        </div>
      ))}
    </div>
  );
}

interface TasksListProps {
  tasks: ShoppingItem[];
  emptyMessage?: string;
}

/**
 * List component for displaying shopping/task items in a popup
 */
export function TasksList({ tasks, emptyMessage = 'No pending items' }: TasksListProps) {
  if (tasks.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-8">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
              {task.item}
            </h3>
            {task.urgent && (
              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full text-xs">
                Urgent
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <p className="capitalize">{task.category}</p>
            {(task as any).assigned_family_member && (
              <div className="flex items-center space-x-1 mt-1">
                <User className="w-3 h-3" />
                <span className="text-xs">For {(task as any).assigned_family_member.name}</span>
              </div>
            )}
          </div>
          {task.quantity && task.quantity > 1 && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Quantity: {task.quantity}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

interface RemindersListProps {
  reminders: Reminder[];
  emptyMessage?: string;
}

/**
 * List component for displaying reminders in a popup
 */
export function RemindersList({
  reminders,
  emptyMessage = 'No upcoming reminders',
}: RemindersListProps) {
  if (reminders.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-8">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div key={reminder.id} className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
              {reminder.title}
            </h3>
            {reminder.priority === 'high' && (
              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full text-xs">
                High Priority
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {formatDate(reminder.reminder_date)}
            {reminder.reminder_time && ` at ${formatEventTime(reminder.reminder_time)}`}
          </p>
          {reminder.description && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {reminder.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
