/**
 * ConflictResolution - UI for resolving calendar sync conflicts
 * TODO: Implement full conflict resolution modal
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';

interface ConflictResolutionProps {
  visible: boolean;
  onClose: () => void;
  onResolve: (resolution: 'local' | 'google' | 'skip') => void;
}

export function ConflictResolution({
  visible,
  onClose,
  onResolve,
}: ConflictResolutionProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} onClose={onClose} title="Sync Conflict">
      <View style={styles.container}>
        <Text style={[styles.description, { color: theme.colors.text.primary }]}>
          This event has been modified both locally and in Google Calendar.
          Which version would you like to keep?
        </Text>

        <View style={styles.comparison}>
          <View style={styles.version}>
            <Text style={[styles.versionTitle, { color: theme.colors.text.secondary }]}>
              Local Version
            </Text>
            <Text style={[styles.versionDetail, { color: theme.colors.text.primary }]}>
              {/* TODO: Display local event details */}
              Modified locally
            </Text>
          </View>

          <View style={styles.version}>
            <Text style={[styles.versionTitle, { color: theme.colors.text.secondary }]}>
              Google Calendar
            </Text>
            <Text style={[styles.versionDetail, { color: theme.colors.text.primary }]}>
              {/* TODO: Display Google event details */}
              Modified in Google Calendar
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <Button
            title="Keep Local"
            onPress={() => onResolve('local')}
            style={styles.button}
          />
          <Button
            title="Keep Google"
            variant="secondary"
            onPress={() => onResolve('google')}
            style={styles.button}
          />
          <Button
            title="Skip"
            variant="outline"
            onPress={() => onResolve('skip')}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  comparison: {
    gap: 16,
    marginBottom: 24,
  },
  version: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  versionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  versionDetail: {
    fontSize: 14,
  },
  buttons: {
    gap: 12,
  },
  button: {
    width: '100%',
  },
});
