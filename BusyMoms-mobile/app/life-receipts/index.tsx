import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { Screen } from '../../src/components/layout/Screen';
import { ReceiptCard } from '../../src/components/life-receipts/ReceiptCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { lifeReceiptsService, LifeReceipt } from '../../src/services/lifeReceiptsService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LifeReceiptsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: receipts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['life-receipts'],
    queryFn: () => lifeReceiptsService.listReceipts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lifeReceiptsService.deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['life-receipts'] });
    },
  });

  const handleAddPress = () => {
    router.push('/life-receipts/capture' as any);
  };

  const handleReceiptPress = (id: string) => {
    router.push(`/life-receipts/view?id=${id}` as any);
  };

  const handleDeletePress = (receipt: LifeReceipt) => {
    Alert.alert('Delete Receipt', 'Are you sure you want to delete this receipt?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(receipt.id),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Life Receipts',
          headerRight: () => (
            <Pressable
              onPress={handleAddPress}
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                marginRight: 8,
              })}
            >
              <Plus
                size={24}
                color={theme.colors.primary.main}
                // @ts-ignore
                strokeWidth={2}
              />
            </Pressable>
          ),
        }}
      />
      <Screen>
        <View style={styles.container}>
          {receipts.length === 0 && !isLoading ? (
            <EmptyState
              title="No receipts yet"
              description="Capture your life receipts with text, voice, or camera"
              actionLabel="Add Receipt"
              onAction={handleAddPress}
            />
          ) : (
            <FlatList
              data={receipts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ReceiptCard
                  receipt={item}
                  onPress={() => handleReceiptPress(item.id)}
                  onDelete={() => handleDeletePress(item)}
                />
              )}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={refetch}
                  tintColor={theme.colors.primary.main}
                />
              }
            />
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
});
