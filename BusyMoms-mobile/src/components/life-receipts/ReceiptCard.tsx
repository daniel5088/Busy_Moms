import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { LifeReceipt } from '../../services/lifeReceiptsService';
import { Badge } from '../ui/Badge';

interface ReceiptCardProps {
  receipt: LifeReceipt;
  onPress: () => void;
  onDelete: () => void;
}

export function ReceiptCard({ receipt, onPress, onDelete }: ReceiptCardProps) {
  const { theme } = useTheme();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const receiptDate = new Date(date);
    receiptDate.setHours(0, 0, 0, 0);

    if (receiptDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (receiptDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.default,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[styles.date, { color: theme.colors.text.secondary }]}
          numberOfLines={1}
        >
          {formatDate(receipt.created_at)}
        </Text>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Trash2
            size={20}
            color={theme.colors.status.error}
            // @ts-ignore
            strokeWidth={2}
          />
        </Pressable>
      </View>

      <Text
        style={[styles.content, { color: theme.colors.text.primary }]}
        numberOfLines={3}
      >
        {receipt.content}
      </Text>

      <View style={styles.tags}>
        {receipt.where && receipt.where !== 'unknown' && (
          <Badge variant="neutral" text={receipt.where} />
        )}
        {receipt.who && receipt.who !== 'unknown' && (
          <Badge variant="neutral" text={receipt.who} />
        )}
        {receipt.when_bucket && receipt.when_bucket !== 'someday' && (
          <Badge variant="primary" text={receipt.when_bucket} />
        )}
        {receipt.obligation && receipt.obligation !== 'unknown' && (
          <Badge variant="success" text={receipt.obligation} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
