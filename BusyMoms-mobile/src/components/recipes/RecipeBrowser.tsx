import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecipeList } from './RecipeList';
import type { Recipe } from '../../types/database';

interface RecipeBrowserProps {
  myRecipes: Recipe[];
  savedRecipes: Recipe[];
  searchResults: Recipe[];
  onPressRecipe: (recipe: Recipe) => void;
  onToggleSave: (recipeId: string, isSaved: boolean) => void;
  onSearch: (query: string) => void;
  onRefresh?: () => void;
  savedRecipeIds: Set<string>;
  loading?: boolean;
  refreshing?: boolean;
}

type TabType = 'my-recipes' | 'saved' | 'search';

export function RecipeBrowser({
  myRecipes,
  savedRecipes,
  searchResults,
  onPressRecipe,
  onToggleSave,
  onSearch,
  onRefresh,
  savedRecipeIds,
  loading = false,
  refreshing = false,
}: RecipeBrowserProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<TabType>('my-recipes');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 3) {
      onSearch(query.trim());
      setActiveTab('search');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveTab('my-recipes');
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Search Bar */}
      <View style={[styles.searchSection, isDark && styles.searchSectionDark]}>
        <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
          <Ionicons
            name="search"
            size={20}
            color={isDark ? '#9ca3af' : '#6b7280'}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search recipes from TheMealDB..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons
                name="close-circle"
                size={20}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      {activeTab !== 'search' && (
        <View style={[styles.tabs, isDark && styles.tabsDark]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'my-recipes' && styles.tabActive,
              activeTab === 'my-recipes' && isDark && styles.tabActiveDark,
            ]}
            onPress={() => setActiveTab('my-recipes')}
          >
            <Ionicons
              name="restaurant"
              size={20}
              color={
                activeTab === 'my-recipes'
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
                activeTab === 'my-recipes' && styles.tabTextActive,
                activeTab === 'my-recipes' && isDark && styles.tabTextActiveDark,
              ]}
            >
              My Recipes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'saved' && styles.tabActive,
              activeTab === 'saved' && isDark && styles.tabActiveDark,
            ]}
            onPress={() => setActiveTab('saved')}
          >
            <Ionicons
              name="heart"
              size={20}
              color={
                activeTab === 'saved'
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
                activeTab === 'saved' && styles.tabTextActive,
                activeTab === 'saved' && isDark && styles.tabTextActiveDark,
              ]}
            >
              Saved
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'my-recipes' && (
          <RecipeList
            recipes={myRecipes}
            onPressRecipe={onPressRecipe}
            onToggleSave={onToggleSave}
            savedRecipeIds={savedRecipeIds}
            onRefresh={onRefresh}
            refreshing={refreshing}
            loading={loading}
            emptyMessage="No recipes yet. Create your first recipe or search from TheMealDB!"
          />
        )}

        {activeTab === 'saved' && (
          <RecipeList
            recipes={savedRecipes}
            onPressRecipe={onPressRecipe}
            onToggleSave={onToggleSave}
            savedRecipeIds={savedRecipeIds}
            onRefresh={onRefresh}
            refreshing={refreshing}
            loading={loading}
            emptyMessage="No saved recipes. Save recipes by tapping the heart icon!"
          />
        )}

        {activeTab === 'search' && (
          <View style={styles.searchContent}>
            <View style={[styles.searchHeader, isDark && styles.searchHeaderDark]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setActiveTab('my-recipes')}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={isDark ? '#60a5fa' : '#3b82f6'}
                />
              </TouchableOpacity>
              <Text style={[styles.searchHeaderText, isDark && styles.searchHeaderTextDark]}>
                Search Results
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <RecipeList
              recipes={searchResults}
              onPressRecipe={onPressRecipe}
              onToggleSave={onToggleSave}
              savedRecipeIds={savedRecipeIds}
              loading={loading}
              emptyMessage={
                searchQuery.length < 3
                  ? 'Enter at least 3 characters to search'
                  : 'No recipes found. Try a different search term.'
              }
            />
          </View>
        )}
      </View>
    </View>
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
  searchSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchSectionDark: {
    borderBottomColor: '#374151',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchContainerDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  searchInputDark: {
    color: '#f9fafb',
  },
  clearButton: {
    padding: 4,
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
  content: {
    flex: 1,
  },
  searchContent: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchHeaderDark: {
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 4,
  },
  searchHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  searchHeaderTextDark: {
    color: '#f9fafb',
  },
});
