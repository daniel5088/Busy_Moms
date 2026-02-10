import React from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { RecipeCard } from './RecipeCard';
import type { Recipe } from '../../types/database';

interface RecipeListProps {
  recipes: Recipe[];
  onPressRecipe: (recipe: Recipe) => void;
  onToggleSave?: (recipeId: string, isSaved: boolean) => void;
  savedRecipeIds?: Set<string>;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export function RecipeList({
  recipes,
  onPressRecipe,
  onToggleSave,
  savedRecipeIds = new Set(),
  onRefresh,
  refreshing = false,
  loading = false,
  emptyMessage = 'No recipes found',
}: RecipeListProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (loading && recipes.length === 0) {
    return (
      <View style={[styles.centerContainer, isDark && styles.centerContainerDark]}>
        <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#3b82f6'} />
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Loading recipes...
        </Text>
      </View>
    );
  }

  if (recipes.length === 0) {
    return (
      <View style={[styles.centerContainer, isDark && styles.centerContainerDark]}>
        <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={recipes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RecipeCard
          recipe={item}
          onPress={onPressRecipe}
          onToggleSave={onToggleSave}
          isSaved={savedRecipeIds.has(item.id)}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#60a5fa' : '#3b82f6'}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  centerContainerDark: {
    backgroundColor: '#111827',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  loadingTextDark: {
    color: '#9ca3af',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
});
