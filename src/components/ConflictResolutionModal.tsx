import React, { useMemo, useState } from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  GitMerge,
} from 'lucide-react';
import type { SyncConflict } from '../services/calendarSync';
import { formatDate } from '../utils/timeFormatters';

interface ConflictResolutionModalProps {
  conflicts: SyncConflict[];
  onResolve: (
    conflictId: string,
    resolution: 'keep_local' | 'keep_google' | 'merge',
    // optional merged fields payload if resolution === 'merge'
    merged?: { title?: string; description?: string }
  ) => Promise<boolean>;
  onClose: () => void;
}

export function ConflictResolutionModal({
  conflicts,
  onResolve,
  onClose,
}: ConflictResolutionModalProps) {
  const [selectedConflictIndex, setSelectedConflictIndex] = useState(0);
  const [resolving, setResolving] = useState(false);

  // New: merge fields
  const [mergeTitle, setMergeTitle] = useState('');
  const [mergeDescription, setMergeDescription] = useState('');

  if (!conflicts || conflicts.length === 0) return null;

  const currentConflict = conflicts[selectedConflictIndex];
  const localData = currentConflict?.local_event_data ?? {};
  const googleData = currentConflict?.google_event_data ?? {};

  // Pre-fill merge editors from current conflict
  useMemo(() => {
    const initialTitle = (localData?.title || googleData?.summary || 'Untitled').toString();
    const initialDesc = (localData?.description || googleData?.description || '').toString();
    setMergeTitle(initialTitle);
    setMergeDescription(initialDesc);
  }, [selectedConflictIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResolve = async (resolution: 'keep_local' | 'keep_google' | 'merge') => {
    setResolving(true);
    try {
      const merged =
        resolution === 'merge'
          ? {
              title: mergeTitle?.trim() || undefined,
              description: mergeDescription?.trim() || undefined,
            }
          : undefined;

      const success = await onResolve(currentConflict.id, resolution, merged);

      if (success) {
        // Move to next conflict or close if this was the last one
        if (selectedConflictIndex < conflicts.length - 1) {
          setSelectedConflictIndex((i) => i + 1);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setResolving(false);
    }
  };

  const safeFormatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not set';
    try {
      // Extract date part if datetime string (format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
      const datePart = dateStr.split('T')[0] || dateStr.split(' ')[0];
      if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return formatDate(datePart);
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string | null | undefined) => (timeStr ? timeStr : 'Not set');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Resolve Sync Conflicts</h2>
                <p className="text-sm text-gray-500">
                  Conflict {selectedConflictIndex + 1} of {conflicts.length}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-orange-800">
              This event was modified in both your local calendar and Google Calendar. Choose which
              version to keep or merge fields.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local Version */}
            <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Local Calendar</h3>
                  <p className="text-xs text-gray-500">
                    Modified: {safeFormatDate(currentConflict.local_modified_at)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Title</label>
                  <p className="text-sm font-medium text-gray-900">
                    {localData.title || 'Untitled'}
                  </p>
                </div>

                {localData.description !== undefined && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Description</label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {localData.description || '—'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600">Date</label>
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Calendar className="w-3 h-3" />
                    <span>{safeFormatDate(localData.event_date)}</span>
                  </div>
                </div>

                {(localData.start_time || localData.end_time) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Time</label>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatTime(localData.start_time)}
                        {localData.end_time && ` - ${formatTime(localData.end_time)}`}
                      </span>
                    </div>
                  </div>
                )}

                {localData.location && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Location</label>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <MapPin className="w-3 h-3" />
                      <span>{localData.location}</span>
                    </div>
                  </div>
                )}

                {Array.isArray(localData.participants) && localData.participants.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Participants</label>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <Users className="w-3 h-3" />
                      <span>{localData.participants.join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Google Version */}
            <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Google Calendar</h3>
                  <p className="text-xs text-gray-500">
                    Modified: {safeFormatDate(currentConflict.google_modified_at)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Title</label>
                  <p className="text-sm font-medium text-gray-900">
                    {googleData.summary || 'Untitled'}
                  </p>
                </div>

                {googleData.description !== undefined && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Description</label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {googleData.description || '—'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600">Date</label>
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {googleData.start?.date
                        ? safeFormatDate(googleData.start.date)
                        : safeFormatDate(googleData.start?.dateTime)}
                    </span>
                  </div>
                </div>

                {googleData.start?.dateTime && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Time</label>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(googleData.start.dateTime).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {googleData.end?.dateTime &&
                          ` - ${new Date(googleData.end.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                      </span>
                    </div>
                  </div>
                )}

                {googleData.location && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Location</label>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <MapPin className="w-3 h-3" />
                      <span>{googleData.location}</span>
                    </div>
                  </div>
                )}

                {Array.isArray(googleData.attendees) && googleData.attendees.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Attendees</label>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <Users className="w-3 h-3" />
                      <span>
                        {googleData.attendees
                          .map((a: any) => a.email || a.displayName)
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Merge editor */}
          <div className="mt-6 border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitMerge className="w-4 h-4 text-purple-600" />
              <div className="text-sm font-medium text-gray-800">Merge fields (optional)</div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Title</span>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={mergeTitle}
                  onChange={(e) => setMergeTitle(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Description</span>
                <textarea
                  className="w-full rounded border px-3 py-2 text-sm min-h-[88px]"
                  value={mergeDescription}
                  onChange={(e) => setMergeDescription(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => handleResolve('keep_local')}
              disabled={resolving}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
            >
              Keep Local Version
            </button>

            <button
              onClick={() => handleResolve('keep_google')}
              disabled={resolving}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
            >
              Keep Google Version
            </button>

            <button
              onClick={() => handleResolve('merge')}
              disabled={resolving}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              <GitMerge className="w-4 h-4" />
              Merge
            </button>

            {selectedConflictIndex < conflicts.length - 1 && (
              <button
                onClick={() => setSelectedConflictIndex((i) => i + 1)}
                disabled={resolving}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <span>Skip</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {resolving && (
            <p className="text-center text-sm text-gray-500 mt-3">Resolving conflict...</p>
          )}
        </div>
      </div>
    </div>
  );
}
