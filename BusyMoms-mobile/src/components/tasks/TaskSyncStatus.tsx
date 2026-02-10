/**
 * TaskSyncStatus Component
 * Displays Google Tasks sync status and manual sync button
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { RefreshCcw, Check, AlertCircle, Cloud } from 'lucide-react-native';
// @ts-ignore
import { useTheme } from '../../hooks/useTheme';
import { formatDistanceToNow } from '../../utils/timeFormatters';

interface TaskSyncStatusProps {
  isEnabled: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  conflictCount?: number;
  onSync: () => void;
  onViewConflicts?: () => void;
}

export function TaskSyncStatus({
  isEnabled,
  isSyncing,
  lastSyncTime,
  conflictCount = 0,
  onSync,
  onViewConflicts,
}: TaskSyncStatusProps) {
  const { theme } = useTheme();

  if (!isEnabled) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.gray[300] + '20' }]}>
        <Cloud size={18} color={theme.colors.text.secondary} />
        <Text style={[styles.text, { color: theme.colors.text.secondary }]}>
          Google Tasks sync is disabled
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Sync Status Banner */}
      <View
        style={[
          styles.container,
          {
            backgroundColor:
              conflictCount > 0 ? theme.colors.status.error + '10' : theme.colors.primary.main + '10',
          },
        ]}
      >
        {isSyncing ? (
          <>
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
            <Text style={[styles.text, { color: theme.colors.primary.main }]}>Syncing tasks...</Text>
          </>
        ) : conflictCount > 0 ? (
          <>
            <AlertCircle size={18} color={theme.colors.status.error} />
            <Text style={[styles.text, { color: theme.colors.status.error }]}>
              {conflictCount} sync conflict{conflictCount > 1 ? 's' : ''}
            </Text>
            {onViewConflicts && (
              <Pressable onPress={onViewConflicts} style={styles.conflictButton}>
                <Text style={[styles.conflictButtonText, { color: theme.colors.status.error }]}>
                  Resolve
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Check size={18} color={theme.colors.status.success} />
            <Text style={[styles.text, { color: theme.colors.status.success }]}>
              {lastSyncTime
                ? `Synced ${formatDistanceToNow(lastSyncTime)} ago`
                : 'Ready to sync'}
            </Text>
          </>
        )}

        {/* Manual Sync Button */}
        <Pressable
          onPress={onSync}
          disabled={isSyncing}
          style={[
            styles.syncButton,
            {
              backgroundColor: theme.colors.primary.main + '20',
              opacity: isSyncing ? 0.5 : 1,
            },
          ]}
        >
          <RefreshCcw size={16} color={theme.colors.primary.main} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    padding: 6,
    borderRadius: 6,
  },
  conflictButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  conflictButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
