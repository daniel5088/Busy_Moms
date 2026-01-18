import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  CheckSquare,
  Bell,
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  User,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import { FamilyMember, Event, Task, Reminder, ShoppingItem, supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/timeFormatters';
import { EventForm } from './forms/EventForm';
import { TaskForm } from './forms/TaskForm';
import { ReminderForm } from './forms/ReminderForm';
import { ShoppingForm } from './forms/ShoppingForm';
import { FamilyMemberForm } from './forms/FamilyMemberForm';

interface FamilyData {
  member: FamilyMember;
  events: Event[];
  tasks: Task[];
  reminders: Reminder[];
  shoppingItems: ShoppingItem[];
}

export function FamilyFolders() {
  const { user } = useAuth();
  const [familyData, setFamilyData] = useState<FamilyData[]>([]);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [activeModal, setActiveModal] = useState<'event' | 'task' | 'reminder' | 'shopping' | null>(
    null
  );
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showFamilyMemberForm, setShowFamilyMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  useEffect(() => {
    if (user) {
      loadFamilyData();
    }
  }, [user]);

  const loadFamilyData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load family members
      const { data: members, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (membersError) throw membersError;

      // Load data for each family member
      const familyDataPromises = (members || []).map(async (member) => {
        const [eventsResult, tasksResult, remindersResult, shoppingResult] = await Promise.all([
          // Events - check assigned_to_name, assigned_to, or participants array
          supabase
            .from('events')
            .select('*')
            .eq('user_id', user.id)
            .or(`assigned_to_name.eq.${member.name},assigned_to.eq.${member.id},participants.cs.{${member.name}}`)
            .order('event_date', { ascending: false }),

          // Tasks - use assigned_to_name, assigned_to, or assigned_to_email
          supabase
            .from('tasks')
            .select('*')
            .or(`assigned_to_name.eq.${member.name},assigned_to.eq.${member.id},assigned_to_email.eq.${member.Email}`)
            .order('created_at', { ascending: false }),

          // Reminders - use assigned_to_name, family_member_id, or family_member_email
          supabase
            .from('reminders')
            .select('*')
            .or(`assigned_to_name.eq.${member.name},family_member_id.eq.${member.id},family_member_email.eq.${member.Email}`)
            .order('reminder_date', { ascending: false }),

          // Shopping items - use assigned_to_name, assigned_to, or assigned_to_email
          supabase
            .from('shopping_lists')
            .select('*')
            .or(`assigned_to_name.eq.${member.name},assigned_to.eq.${member.id},assigned_to_email.eq.${member.Email}`)
            .order('created_at', { ascending: false }),
        ]);

        return {
          member,
          events: eventsResult.data || [],
          tasks: tasksResult.data || [],
          reminders: remindersResult.data || [],
          shoppingItems: shoppingResult.data || [],
        };
      });

      const familyDataResults = await Promise.all(familyDataPromises);
      setFamilyData(familyDataResults);
    } catch (error) {
      console.error('Error loading family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const openModal = (
    type: 'event' | 'task' | 'reminder' | 'shopping',
    member: FamilyMember,
    item?: any
  ) => {
    setSelectedMember(member);
    setEditingItem(item || null);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedMember(null);
    setEditingItem(null);
  };

  const handleItemCreated = () => {
    closeModal();
    loadFamilyData(); // Refresh all data
  };

  const handleFamilyMemberCreated = () => {
    setShowFamilyMemberForm(false);
    setEditingMember(null);
    loadFamilyData(); // Refresh all data
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setShowFamilyMemberForm(true);
  };

  const deleteItem = async (type: 'event' | 'task' | 'reminder' | 'shopping', itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const tableName = type === 'shopping' ? 'shopping_lists' : `${type}s`;
      const { error } = await supabase.from(tableName).delete().eq('id', itemId);

      if (error) throw error;
      loadFamilyData(); // Refresh data
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Error deleting ${type}. Please try again.`);
    }
  };

  const getItemCount = (data: FamilyData) => {
    return (
      data.events.length + data.tasks.length + data.reminders.length + data.shoppingItems.length
    );
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <main className="h-screen overflow-y-auto pb-20 sm:pb-24">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" role="status" aria-label="Loading"></div>
          <span className="ml-2 text-gray-600">Loading family data...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-y-auto pb-20 sm:pb-24">
      {/* Header */}
      <header className="bg-white p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Family Folders</h1>
            <p className="text-sm sm:text-base text-gray-600">Organize by family member</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowFamilyMemberForm(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm hover:shadow-md"
              aria-label="Add family member"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline text-sm font-medium">Add Member</span>
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {familyData.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No family members yet</h3>
            <p className="text-gray-600 mb-4">
              Add family members in Settings to organize their activities
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {familyData.map((data) => {
              const isExpanded = expandedMembers.has(data.member.id);
              const itemCount = getItemCount(data);

              return (
                <div
                  key={data.member.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Family Member Header */}
                  <div className="p-4 sm:p-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleMemberExpansion(data.member.id)}
                      aria-expanded={isExpanded}
                      className="flex-1 flex items-center space-x-4 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-lg sm:text-xl">
                          {data.member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                          {data.member.name}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          {data.member.relationship && (
                            <span className="font-medium text-purple-600">
                              {data.member.relationship}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-xs sm:text-sm text-gray-500">
                          <span>{data.events.length} events</span>
                          <span>{data.tasks.length} tasks</span>
                          <span>{data.reminders.length} reminders</span>
                          <span>{data.shoppingItems.length} shopping items</span>
                          {data.tasks.some(t => t.status === 'completed' && t.points != null && t.points > 0) && (
                            <span className="font-bold text-yellow-600">
                              {data.tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.points || 0), 0)} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMember(data.member);
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        aria-label={`Edit ${data.member.name}`}
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleMemberExpansion(data.member.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 sm:p-6 space-y-6">
                      {/* Member Details */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center space-x-2">
                          <User className="w-4 h-4 text-purple-500" aria-hidden="true" />
                          <span>Member Details</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {data.member.age && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Age:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">{data.member.age} years</span>
                            </div>
                          )}
                          {data.member.gender && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Gender:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">{data.member.gender}</span>
                            </div>
                          )}
                          {data.member.school && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400 font-medium">School:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">{data.member.school}</span>
                            </div>
                          )}
                          {data.member.grade && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Grade:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">{data.member.grade}</span>
                            </div>
                          )}
                        </div>
                        {data.member.allergies && data.member.allergies.length > 0 && (
                          <div className="mt-3">
                            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">Allergies:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {data.member.allergies.map((allergy, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium"
                                >
                                  {allergy}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {data.member.medical_notes && (
                          <div className="mt-3">
                            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">Medical Notes:</span>
                            <p className="mt-1 text-gray-900 dark:text-gray-100 text-sm">{data.member.medical_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => openModal('event', data.member)}
                          className="flex items-center space-x-2 p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Calendar className="w-4 h-4" aria-hidden="true" />
                          <span className="text-xs sm:text-sm font-medium">Add Event</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal('task', data.member)}
                          className="flex items-center space-x-2 p-2 sm:p-3 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          <CheckSquare className="w-4 h-4" aria-hidden="true" />
                          <span className="text-xs sm:text-sm font-medium">Add Task</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal('reminder', data.member)}
                          className="flex items-center space-x-2 p-2 sm:p-3 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          <Bell className="w-4 h-4" aria-hidden="true" />
                          <span className="text-xs sm:text-sm font-medium">Add Reminder</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal('shopping', data.member)}
                          className="flex items-center space-x-2 p-2 sm:p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                          <span className="text-xs sm:text-sm font-medium">Add Item</span>
                        </button>
                      </div>

                      {/* Events Section */}
                      {data.events.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-500" aria-hidden="true" />
                            <span>Events ({data.events.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {data.events.slice(0, 3).map((event) => (
                              <div key={event.id} className="p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 text-sm">
                                      {event.title}
                                    </h5>
                                    <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                                      <span>{formatDate(event.event_date)}</span>
                                      {event.start_time && (
                                        <span>{event.start_time.slice(0, 5)}</span>
                                      )}
                                      {event.location && <span>{event.location}</span>}
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => openModal('event', data.member, event)}
                                      aria-label={`Edit event: ${event.title}`}
                                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                    >
                                      <Edit className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteItem('event', event.id)}
                                      aria-label={`Delete event: ${event.title}`}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    >
                                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {data.events.length > 3 && (
                              <p className="text-xs text-gray-500 text-center">
                                ... and {data.events.length - 3} more events
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tasks Section */}
                      {data.tasks.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                            <CheckSquare className="w-4 h-4 text-purple-500" aria-hidden="true" />
                            <span>Tasks ({data.tasks.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {data.tasks.slice(0, 3).map((task) => (
                              <div key={task.id} className="p-3 bg-purple-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      {task.points != null && task.points > 0 && (
                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center space-x-1">
                                          <span>{task.points}</span>
                                          <span>pts</span>
                                        </span>
                                      )}
                                      <h5
                                        className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}
                                      >
                                        {task.points != null && task.points > 0 ? `${data.member.name} - ${task.title}` : task.title}
                                      </h5>
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs mt-1">
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(task.status || 'pending')}`}
                                      >
                                        {task.status?.replace('_', ' ')}
                                      </span>
                                      {task.priority && (
                                        <span
                                          className={`px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}
                                        >
                                          {task.priority}
                                        </span>
                                      )}
                                      {task.due_date && (
                                        <span className="text-gray-600">
                                          Due {formatDate(task.due_date)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => openModal('task', data.member, task)}
                                      aria-label={`Edit task: ${task.title}`}
                                      className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                                    >
                                      <Edit className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteItem('task', task.id)}
                                      aria-label={`Delete task: ${task.title}`}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    >
                                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {data.tasks.length > 3 && (
                              <p className="text-xs text-gray-500 text-center">
                                ... and {data.tasks.length - 3} more tasks
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reminders Section */}
                      {data.reminders.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                            <Bell className="w-4 h-4 text-orange-500" aria-hidden="true" />
                            <span>Reminders ({data.reminders.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {data.reminders.slice(0, 3).map((reminder) => (
                              <div key={reminder.id} className="p-3 bg-orange-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 text-sm">
                                      {reminder.title}
                                    </h5>
                                    <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                                      <span>{formatDate(reminder.reminder_date)}</span>
                                      {reminder.reminder_time && (
                                        <span>{reminder.reminder_time.slice(0, 5)}</span>
                                      )}
                                      {reminder.priority && (
                                        <span
                                          className={`px-2 py-0.5 rounded-full font-medium ${getPriorityColor(reminder.priority)}`}
                                        >
                                          {reminder.priority}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => openModal('reminder', data.member, reminder)}
                                      aria-label={`Edit reminder: ${reminder.title}`}
                                      className="p-1 text-orange-600 hover:bg-orange-100 rounded"
                                    >
                                      <Edit className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteItem('reminder', reminder.id)}
                                      aria-label={`Delete reminder: ${reminder.title}`}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    >
                                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {data.reminders.length > 3 && (
                              <p className="text-xs text-gray-500 text-center">
                                ... and {data.reminders.length - 3} more reminders
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Shopping Items Section */}
                      {data.shoppingItems.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                            <ShoppingBag className="w-4 h-4 text-green-500" aria-hidden="true" />
                            <span>Shopping Items ({data.shoppingItems.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {data.shoppingItems.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                className={`p-3 rounded-lg ${item.completed ? 'bg-gray-50' : 'bg-green-50'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h5
                                      className={`font-medium text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                                    >
                                      {item.item}
                                    </h5>
                                    <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                                      <span className="capitalize">{item.category}</span>
                                      {item.quantity && item.quantity > 1 && (
                                        <span>Qty: {item.quantity}</span>
                                      )}
                                      {item.urgent && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                          Urgent
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => openModal('shopping', data.member, item)}
                                      aria-label={`Edit shopping item: ${item.item}`}
                                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                                    >
                                      <Edit className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteItem('shopping', item.id)}
                                      aria-label={`Delete shopping item: ${item.item}`}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    >
                                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {data.shoppingItems.length > 3 && (
                              <p className="text-xs text-gray-500 text-center">
                                ... and {data.shoppingItems.length - 3} more items
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {itemCount === 0 && (
                        <div className="text-center py-8">
                          <User className="w-8 h-8 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                          <p className="text-gray-500 text-sm">
                            No activities yet for {data.member.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            Use the buttons above to add events, tasks, reminders, or shopping items
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === 'event' && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 id="event-modal-title" className="text-lg font-bold text-gray-900">
                  {editingItem ? 'Edit Event' : `Add Event for ${selectedMember.name}`}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close dialog"
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" aria-hidden="true" />
                </button>
              </div>
              <EventForm event={editingItem} onCancel={closeModal} onSaved={handleItemCreated} />
            </div>
          </div>
        </div>
      )}

      {activeModal === 'task' && selectedMember && (
        <TaskForm
          isOpen={true}
          onClose={closeModal}
          onTaskCreated={handleItemCreated}
          editTask={editingItem}
        />
      )}

      {activeModal === 'reminder' && selectedMember && (
        <ReminderForm
          isOpen={true}
          onClose={closeModal}
          onReminderCreated={handleItemCreated}
          editReminder={editingItem}
          preselectedMember={selectedMember}
        />
      )}

      {activeModal === 'shopping' && selectedMember && (
        <ShoppingForm
          isOpen={true}
          onClose={closeModal}
          onItemCreated={handleItemCreated}
          editItem={editingItem}
        />
      )}

      <FamilyMemberForm
        isOpen={showFamilyMemberForm}
        onClose={() => {
          setShowFamilyMemberForm(false);
          setEditingMember(null);
        }}
        onMemberCreated={handleFamilyMemberCreated}
        editMember={editingMember}
      />
    </main>
  );
}
