import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import {
  useRecipe,
  useRecipeIngredients,
} from '../../src/hooks/useRecipes';
import {
  useIsRecipeSaved,
  useSaveRecipe,
  useUnsaveRecipe,
} from '../../src/hooks/useSavedRecipes';
import { useCreateShoppingItem } from '../../src/hooks/useShoppingItems';
import { RecipeDetail } from '../../src/components/recipes';
import { getInstacartRecipeUrl } from '../../src/services/instacartService';
import type { RecipeIngredient } from '../../src/types/database';

export default function RecipeDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Queries
  const { data: recipe, isLoading: loadingRecipe } = useRecipe(id || '');
  const { data: ingredients = [], isLoading: loadingIngredients } = useRecipeIngredients(
    id || ''
  );
  const { data: isSaved = false } = useIsRecipeSaved(id || '');

  // Mutations
  const saveRecipeMutation = useSaveRecipe();
  const unsaveRecipeMutation = useUnsaveRecipe();
  const createItemMutation = useCreateShoppingItem();

  // Handlers
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/shopping');
    }
  };

  const handleToggleSave = async (recipeId: string, currentSaved: boolean) => {
    try {
      if (currentSaved) {
        await unsaveRecipeMutation.mutateAsync(recipeId);
      } else {
        await saveRecipeMutation.mutateAsync(recipeId);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update recipe';
      Alert.alert('Error', message);
    }
  };

  const handleAddIngredientsToShoppingList = async (
    ingredients: RecipeIngredient[],
    servings: number
  ) => {
    if (!user || !recipe) return;

    try {
      // Scale ingredients based on servings
      const originalServings = recipe.servings || 4;
      const factor = servings / originalServings;

      const items = ingredients.map((ing) => ({
        item: ing.name,
        quantity: ing.quantity ? Math.round(ing.quantity * factor * 100) / 100 : null,
        unit: ing.unit,
        category: ing.category || 'other',
        notes: null,
      }));

      // Add all items
      for (const item of items) {
        await createItemMutation.mutateAsync({
          ...item,
          completed: false,
        });
      }

      Alert.alert(
        'Success',
        `Added ${items.length} ingredients to shopping list`,
        [
          { text: 'OK' },
          {
            text: 'View Shopping List',
            onPress: () => router.push('/(tabs)/shopping'),
          },
        ]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add ingredients';
      Alert.alert('Error', message);
    }
  };

  const handleSendToInstacart = async () => {
    if (!recipe) return;

    try {
      const url = await getInstacartRecipeUrl(recipe, ingredients);
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Failed to create Instacart recipe page');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send recipe to Instacart';
      Alert.alert('Error', message);
    }
  };

  if (loadingRecipe || loadingIngredients) {
    return (
      <SafeAreaView
        style={[styles.container, isDark && styles.containerDark]}
        edges={['top']}
      >
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? '#f9fafb' : '#111827'}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
            Recipe
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#3b82f6'} />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Loading recipe...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView
        style={[styles.container, isDark && styles.containerDark]}
        edges={['top']}
      >
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? '#f9fafb' : '#111827'}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
            Recipe
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={isDark ? '#ef4444' : '#dc2626'}
          />
          <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
            Recipe not found
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.push('/(tabs)/shopping')}
          >
            <Text style={styles.errorButtonText}>Go to Recipes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <RecipeDetail
      visible={true}
      recipe={recipe}
      ingredients={ingredients}
      onClose={handleClose}
      onToggleSave={handleToggleSave}
      onAddToShoppingList={handleAddIngredientsToShoppingList}
      onSendToInstacart={handleSendToInstacart}
      isSaved={isSaved}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerTitleDark: {
    color: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  loadingTextDark: {
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 24,
  },
  errorTextDark: {
    color: '#f9fafb',
  },
  errorButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
