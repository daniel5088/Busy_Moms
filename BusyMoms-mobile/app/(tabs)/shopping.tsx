import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import {
  useShoppingItems,
  useCreateShoppingItem,
  useUpdateShoppingItem,
  useDeleteShoppingItem,
  useToggleItemCompleted,
} from '../../src/hooks/useShoppingItems';
import {
  useRecipes,
  useRecipeIngredients,
} from '../../src/hooks/useRecipes';
import {
  useSavedRecipes,
  useSaveRecipe,
  useUnsaveRecipe,
} from '../../src/hooks/useSavedRecipes';
import { useSearchRecipes } from '../../src/hooks/useTheMealDB';
import {
  usePreferredRetailers,
  useNearbyRetailers,
} from '../../src/hooks/useRetailer';
import {
  ShoppingList,
  ShoppingForm,
  ShoppingFormData,
  InstacartButton,
  RetailerSelector,
} from '../../src/components/shopping';
import {
  RecipeBrowser,
  RecipeDetail,
} from '../../src/components/recipes';
import { sendToInstacart } from '../../src/services/instacartShoppingService';
import { getInstacartRecipeUrl } from '../../src/services/instacartService';
import type { ShoppingItem, Recipe, RecipeIngredient } from '../../src/types/database';

type TabType = 'shopping' | 'recipes';

export default function ShoppingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('shopping');

  // Shopping state
  const [showShoppingForm, setShowShoppingForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | undefined>();
  const [showRetailerSelector, setShowRetailerSelector] = useState(false);

  // Recipe state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyRetailersPostalCode, setNearbyRetailersPostalCode] = useState('');

  // Shopping queries
  const { data: shoppingItems = [], isLoading: loadingItems, refetch: refetchItems } = useShoppingItems();
  const createItemMutation = useCreateShoppingItem();
  const updateItemMutation = useUpdateShoppingItem();
  const deleteItemMutation = useDeleteShoppingItem();
  const toggleItemMutation = useToggleItemCompleted();

  // Recipe queries
  const { data: myRecipes = [], isLoading: loadingRecipes, refetch: refetchRecipes } = useRecipes();
  const { data: savedRecipes = [] } = useSavedRecipes();
  const { data: searchResults = [], isLoading: searchLoading } = useSearchRecipes(searchQuery);

  // Recipe ingredients (for selected recipe)
  const { data: recipeIngredients = [] } = useRecipeIngredients(
    selectedRecipe?.id || ''
  );

  // Retailer queries
  const { data: preferredRetailers = [] } = usePreferredRetailers();
  const { data: nearbyRetailers = [], isLoading: loadingRetailers } = useNearbyRetailers(
    nearbyRetailersPostalCode,
    'US'
  );
  const saveRecipeMutation = useSaveRecipe();
  const unsaveRecipeMutation = useUnsaveRecipe();

  // Saved recipe IDs for quick lookup
  const savedRecipeIds = new Set(savedRecipes.map((r: Recipe) => r.id));

  // Shopping handlers
  const handleAddShoppingItem = () => {
    setEditingItem(undefined);
    setShowShoppingForm(true);
  };

  const handleEditShoppingItem = (item: ShoppingItem) => {
    setEditingItem(item);
    setShowShoppingForm(true);
  };

  const handleSubmitShoppingItem = async (data: ShoppingFormData) => {
    if (!user) return;

    try {
      if (editingItem) {
        await updateItemMutation.mutateAsync({
          itemId: editingItem.id,
          updates: data,
        });
      } else {
        await createItemMutation.mutateAsync({
          ...data,
          completed: false,
        });
      }
      setShowShoppingForm(false);
      setEditingItem(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save item';
      Alert.alert('Error', message);
    }
  };

  const handleDeleteShoppingItem = (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItemMutation.mutateAsync(itemId);
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Failed to delete item';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleToggleItemCompleted = async (itemId: string, completed: boolean) => {
    try {
      await toggleItemMutation.mutateAsync({ itemId, completed });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update item';
      Alert.alert('Error', message);
    }
  };

  const handleSendToInstacart = async (retailerKey?: string) => {
    const uncompleted = shoppingItems.filter((item) => !item.completed);

    if (uncompleted.length === 0) {
      Alert.alert('No Items', 'Add items to your shopping list first');
      return;
    }

    try {
      const response = await sendToInstacart(uncompleted, retailerKey);
      if (response?.products_link_url) {
        await Linking.openURL(response.products_link_url);
      } else {
        Alert.alert('Error', 'Failed to create Instacart cart');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send to Instacart';
      Alert.alert('Error', message);
    }
  };

  const handleSelectRetailer = (retailerKey: string) => {
    setShowRetailerSelector(false);
    handleSendToInstacart(retailerKey);
  };

  const handleSearchRetailers = (postalCode: string) => {
    setNearbyRetailersPostalCode(postalCode);
  };

  // Recipe handlers
  const handlePressRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeDetail(true);
  };

  const handleToggleSaveRecipe = async (recipeId: string, isSaved: boolean) => {
    try {
      if (isSaved) {
        await unsaveRecipeMutation.mutateAsync(recipeId);
      } else {
        await saveRecipeMutation.mutateAsync(recipeId);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update recipe';
      Alert.alert('Error', message);
    }
  };

  const handleSearchRecipes = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddIngredientsToShoppingList = async (
    ingredients: RecipeIngredient[],
    servings: number
  ) => {
    if (!user || !selectedRecipe) return;

    try {
      // Scale ingredients based on servings
      const originalServings = selectedRecipe.servings || 4;
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

      Alert.alert('Success', `Added ${items.length} ingredients to shopping list`);
      setShowRecipeDetail(false);
      setActiveTab('shopping');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add ingredients';
      Alert.alert('Error', message);
    }
  };

  const handleSendRecipeToInstacart = async () => {
    if (!selectedRecipe) return;

    try {
      const url = await getInstacartRecipeUrl(selectedRecipe, recipeIngredients);
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

  const uncompletedCount = shoppingItems.filter((item) => !item.completed).length;

  return (
    <SafeAreaView
      style={[styles.container, isDark && styles.containerDark]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Shopping & Recipes
        </Text>

        {activeTab === 'shopping' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddShoppingItem}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, isDark && styles.tabsDark]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'shopping' && styles.tabActive,
            activeTab === 'shopping' && isDark && styles.tabActiveDark,
          ]}
          onPress={() => setActiveTab('shopping')}
        >
          <Ionicons
            name="cart"
            size={20}
            color={
              activeTab === 'shopping'
                ? isDark
                  ? '#60a5fa'
                  : '#3b82f6'
                : isDark
                ? '#9ca3af'
                : '#6b7280'
            }
          />
          <Text
            style={[
              styles.tabText,
              isDark && styles.tabTextDark,
              activeTab === 'shopping' && styles.tabTextActive,
              activeTab === 'shopping' && isDark && styles.tabTextActiveDark,
            ]}
          >
            Shopping List
          </Text>
          {uncompletedCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{uncompletedCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'recipes' && styles.tabActive,
            activeTab === 'recipes' && isDark && styles.tabActiveDark,
          ]}
          onPress={() => setActiveTab('recipes')}
        >
          <Ionicons
            name="restaurant"
            size={20}
            color={
              activeTab === 'recipes'
                ? isDark
                  ? '#60a5fa'
                  : '#3b82f6'
                : isDark
                ? '#9ca3af'
                : '#6b7280'
            }
          />
          <Text
            style={[
              styles.tabText,
              isDark && styles.tabTextDark,
              activeTab === 'recipes' && styles.tabTextActive,
              activeTab === 'recipes' && isDark && styles.tabTextActiveDark,
            ]}
          >
            Recipes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'shopping' && (
          <View style={styles.tabContentContainer}>
            {/* Instacart Button */}
            {uncompletedCount > 0 && (
              <View style={styles.instacartSection}>
                <InstacartButton
                  onPress={() => setShowRetailerSelector(true)}
                  itemCount={uncompletedCount}
                  fullWidth
                />
              </View>
            )}

            {/* Shopping List */}
            <ShoppingList
              items={shoppingItems}
              onToggleItem={handleToggleItemCompleted}
              onEditItem={handleEditShoppingItem}
              onDeleteItem={handleDeleteShoppingItem}
              onRefresh={refetchItems}
              refreshing={loadingItems}
              showCompleted={true}
            />
          </View>
        )}

        {activeTab === 'recipes' && (
          <RecipeBrowser
            myRecipes={myRecipes}
            savedRecipes={savedRecipes}
            searchResults={searchResults as unknown as Recipe[]}
            onPressRecipe={handlePressRecipe}
            onToggleSave={handleToggleSaveRecipe}
            onSearch={handleSearchRecipes}
            onRefresh={refetchRecipes}
            savedRecipeIds={savedRecipeIds}
            loading={searchLoading}
            refreshing={loadingRecipes}
          />
        )}
      </View>

      {/* Modals */}
      <ShoppingForm
        visible={showShoppingForm}
        onClose={() => {
          setShowShoppingForm(false);
          setEditingItem(undefined);
        }}
        onSubmit={handleSubmitShoppingItem}
        initialData={editingItem}
        loading={createItemMutation.isPending || updateItemMutation.isPending}
      />

      <RetailerSelector
        visible={showRetailerSelector}
        onClose={() => setShowRetailerSelector(false)}
        onSelectRetailer={handleSelectRetailer}
        preferredRetailers={preferredRetailers}
        onSearchRetailers={handleSearchRetailers}
        searchResults={nearbyRetailers}
        loading={loadingRetailers}
      />

      <RecipeDetail
        visible={showRecipeDetail}
        recipe={selectedRecipe}
        ingredients={recipeIngredients}
        onClose={() => {
          setShowRecipeDetail(false);
          setSelectedRecipe(null);
        }}
        onToggleSave={handleToggleSaveRecipe}
        onAddToShoppingList={handleAddIngredientsToShoppingList}
        onSendToInstacart={handleSendRecipeToInstacart}
        isSaved={selectedRecipe ? savedRecipeIds.has(selectedRecipe.id) : false}
      />
    </SafeAreaView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerTitleDark: {
    color: '#f9fafb',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabsDark: {
    borderBottomColor: '#374151',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabActiveDark: {
    borderBottomColor: '#60a5fa',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextDark: {
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  tabTextActiveDark: {
    color: '#60a5fa',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContentContainer: {
    flex: 1,
  },
  instacartSection: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
});
