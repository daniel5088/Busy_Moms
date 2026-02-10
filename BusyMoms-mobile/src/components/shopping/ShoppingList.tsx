import React, { useMemo, useState } from 'react';
import {
  SectionList,
  View,
  Text,
  StyleSheet,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { ShoppingItemCard } from './ShoppingItemCard';
import { CategorySection } from './CategorySection';
import type { ShoppingItem } from '../../types/database';

interface ShoppingListProps {
  items: ShoppingItem[];
  onToggleItem: (id: string, completed: boolean) => void;
  onEditItem: (item: ShoppingItem) => void;
  onDeleteItem: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  showCompleted?: boolean;
}

interface SectionData {
  title: string;
  data: ShoppingItem[];
  completedCount: number;
}

export function ShoppingList({
  items,
  onToggleItem,
  onEditItem,
  onDeleteItem,
  onRefresh,
  refreshing = false,
  showCompleted = true,
}: ShoppingListProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Group items by category
  const sections = useMemo(() => {
    const filteredItems = showCompleted
      ? items
      : items.filter((item) => !item.completed);

    const grouped = filteredItems.reduce((acc, item) => {
      const category = item.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);

    return Object.entries(grouped)
      .map(([category, categoryItems]) => ({
        title: category,
        data: collapsedSections.has(category) ? [] : categoryItems,
        completedCount: categoryItems.filter((item) => item.completed).length,
        totalCount: categoryItems.length,
      }))
      .sort((a, b) => {
        // Sort by completion status (incomplete categories first)
        const aComplete = a.completedCount === a.totalCount;
        const bComplete = b.completedCount === b.totalCount;
        if (aComplete !== bComplete) {
          return aComplete ? 1 : -1;
        }
        // Then alphabetically
        return a.title.localeCompare(b.title);
      });
  }, [items, showCompleted, collapsedSections]);

  const handleToggleSection = (category: string, collapsed: boolean) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (collapsed) {
        next.add(category);
      } else {
        next.delete(category);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
        <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
          No items in your shopping list
        </Text>
        <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
          Tap the + button to add items
        </Text>
      </View>
    );
  }

  if (!showCompleted && sections.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
        <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
          All items completed! 🎉
        </Text>
        <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
          Show completed items to see your list
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ShoppingItemCard
          item={item}
          onToggle={onToggleItem}
          onEdit={onEditItem}
          onDelete={onDeleteItem}
        />
      )}
      renderSectionHeader={({ section }) => (
        <CategorySection
          title={section.title}
          itemCount={section.totalCount}
          completedCount={section.completedCount}
          isCollapsed={collapsedSections.has(section.title)}
          onToggleCollapse={handleToggleSection}
        />
      )}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.listContent}
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
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  emptyContainerDark: {
    backgroundColor: '#111827',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#f9fafb',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptySubtextDark: {
    color: '#9ca3af',
  },
});
