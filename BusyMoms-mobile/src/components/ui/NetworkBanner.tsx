/**
 * Network Banner
 * Shows connection status and sync progress at the top of the screen
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export function NetworkBanner() {
  const { theme } = useTheme();
  const { isConnected } = useNetworkStatus();
  const { isProcessing, pendingOperations } = useOfflineSync();

  // Don't show if connected and not processing
  if (isConnected && !isProcessing) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isConnected
            ? theme.colors.status.info
            : theme.colors.status.warning,
        },
      ]}
    >
      {!isConnected ? (
        <View style={styles.content}>
          <WifiOff size={16} color="#FFFFFF" style={styles.icon} />
          <Text style={styles.text}>
            No internet connection
            {pendingOperations > 0 && ` • ${pendingOperations} pending`}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <RefreshCw size={16} color="#FFFFFF" style={styles.icon} />
          <Text style={styles.text}>Syncing {pendingOperations} items...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
