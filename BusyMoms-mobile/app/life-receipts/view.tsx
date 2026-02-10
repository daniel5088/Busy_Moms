import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { Screen } from '../../src/components/layout/Screen';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { lifeReceiptsService } from '../../src/services/lifeReceiptsService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '../../src/components/ui/Skeleton';

export default function ViewReceiptScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['life-receipt', id],
    queryFn: () => lifeReceiptsService.getReceipt(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => lifeReceiptsService.deleteReceipt(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['life-receipts'] });
      router.back();
    },
  });

  const handleDelete = () => {
    Alert.alert('Delete Receipt', 'Are you sure you want to delete this receipt?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading || !receipt) {
    return (
      <>
        <Stack.Screen options={{ title: 'Receipt Details' }} />
        <Screen>
          <View style={styles.container}>
            <Skeleton width="60%" height={20} style={styles.skeletonDate} />
            <Skeleton width="100%" height={120} style={styles.skeletonContent} />
            <Skeleton width="40%" height={30} style={styles.skeletonBadge} />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Receipt Details' }} />
      <Screen>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={[styles.date, { color: theme.colors.text.secondary }]}>
            {formatDate(receipt.created_at)}
          </Text>

          <View
            style={[
              styles.contentBox,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.border.default,
              },
            ]}
          >
            <Text style={[styles.content, { color: theme.colors.text.primary }]}>
              {receipt.content}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
              Details
            </Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                  Where
                </Text>
                <Badge variant="neutral" text={receipt.where} />
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                  Who
                </Text>
                <Badge variant="neutral" text={receipt.who} />
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                  When
                </Text>
                <Badge variant="primary" text={receipt.when_bucket} />
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                  Priority
                </Text>
                <Badge variant="success" text={receipt.obligation} />
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button title="Delete Receipt" variant="danger" onPress={handleDelete} />
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  contentBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  skeletonDate: {
    marginBottom: 16,
  },
  skeletonContent: {
    marginBottom: 24,
  },
  skeletonBadge: {
    marginBottom: 12,
  },
});
