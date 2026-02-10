import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CategorySectionProps {
  title: string;
  itemCount: number;
  completedCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (category: string, collapsed: boolean) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  produce: 'leaf',
  dairy: 'water',
  meat: 'restaurant',
  pantry: 'cube',
  bakery: 'cafe',
  frozen: 'snow',
  beverages: 'wine',
  snacks: 'fast-food',
  household: 'home',
  personal_care: 'heart',
  other: 'ellipsis-horizontal',
};

const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  meat: 'Meat & Seafood',
  pantry: 'Pantry',
  bakery: 'Bakery',
  frozen: 'Frozen',
  beverages: 'Beverages',
  snacks: 'Snacks',
  household: 'Household',
  personal_care: 'Personal Care',
  other: 'Other',
};

export function CategorySection({
  title,
  itemCount,
  completedCount,
  isCollapsed = false,
  onToggleCollapse,
}: CategorySectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const categoryKey = title.toLowerCase().replace(/\s+/g, '_');
  const iconName = CATEGORY_ICONS[categoryKey] || 'ellipsis-horizontal';
  const displayTitle = CATEGORY_LABELS[categoryKey] || title;

  const handlePress = () => {
    onToggleCollapse?.(title, !isCollapsed);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isDark && styles.containerDark]}
      onPress={handlePress}
      disabled={!onToggleCollapse}
    >
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
          <Ionicons
            name={iconName as keyof typeof Ionicons.glyphMap}
            size={18}
            color={isDark ? '#60a5fa' : '#3b82f6'}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            {displayTitle}
          </Text>
          <Text style={[styles.count, isDark && styles.countDark]}>
            {completedCount} of {itemCount} completed
          </Text>
        </View>
      </View>

      {onToggleCollapse && (
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={isDark ? '#9ca3af' : '#6b7280'}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  containerDark: {
    backgroundColor: '#111827',
    borderBottomColor: '#374151',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerDark: {
    backgroundColor: '#1e3a8a',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  titleDark: {
    color: '#f9fafb',
  },
  count: {
    fontSize: 13,
    color: '#6b7280',
  },
  countDark: {
    color: '#9ca3af',
  },
});
