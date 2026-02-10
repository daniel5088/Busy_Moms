/**
 * SyncStatus - Display Google Calendar sync status
 * TODO: Implement full sync status UI with manual sync button
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
// @ts-ignore - RefreshCcw icon not in type definitions
import { RefreshCcw } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useCalendarSync } from '../../hooks/useCalendarSync';

export function SyncStatus() {
  const { theme } = useTheme();
  const { isConnected, isSyncing, lastSyncTime, performSync } = useCalendarSync();

  if (!isConnected) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.card }]}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
          Last sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
        </Text>
      </View>

      <Pressable
        onPress={performSync}
        disabled={isSyncing}
        style={({ pressed }) => [
          styles.syncButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <RefreshCcw
          size={16}
          color={theme.colors.primary.main}
          style={isSyncing ? styles.spinning : undefined}
        />
        <Text style={[styles.syncText, { color: theme.colors.primary.main }]}>
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 13,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 14,
    fontWeight: '600',
  },
  spinning: {
    // TODO: Add rotation animation
  },
});
