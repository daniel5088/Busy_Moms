import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
} from 'react-native';
import type { RecipeIngredient } from '../../types/database';

interface IngredientListProps {
  ingredients: RecipeIngredient[];
  originalServings: number;
  currentServings: number;
}

export function IngredientList({
  ingredients,
  originalServings,
  currentServings,
}: IngredientListProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Scale ingredients based on servings
  const scaledIngredients = useMemo(() => {
    if (originalServings === currentServings) {
      return ingredients;
    }

    const factor = currentServings / originalServings;

    return ingredients.map((ing) => {
      if (!ing.quantity) {
        return ing;
      }

      const scaledQuantity = Math.round(ing.quantity * factor * 100) / 100;

      return {
        ...ing,
        quantity: scaledQuantity,
      };
    });
  }, [ingredients, originalServings, currentServings]);

  // Group by category if available
  const groupedIngredients = useMemo(() => {
    const groups: Record<string, RecipeIngredient[]> = {};

    scaledIngredients.forEach((ing) => {
      const category = ing.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(ing);
    });

    return Object.entries(groups);
  }, [scaledIngredients]);

  const formatQuantity = (quantity: number | null): string => {
    if (!quantity) return '';

    // Handle fractions for common values
    if (quantity === 0.25) return '¼';
    if (quantity === 0.33) return '⅓';
    if (quantity === 0.5) return '½';
    if (quantity === 0.66) return '⅔';
    if (quantity === 0.75) return '¾';

    // Handle mixed fractions
    const whole = Math.floor(quantity);
    const fraction = quantity - whole;

    if (fraction === 0) {
      return whole.toString();
    }

    if (fraction === 0.25) return `${whole} ¼`;
    if (fraction === 0.33) return `${whole} ⅓`;
    if (fraction === 0.5) return `${whole} ½`;
    if (fraction === 0.66) return `${whole} ⅔`;
    if (fraction === 0.75) return `${whole} ¾`;

    // Default to decimal with max 2 decimal places
    return quantity.toFixed(2).replace(/\.?0+$/, '');
  };

  const formatIngredient = (ing: RecipeIngredient): string => {
    const parts: string[] = [];

    if (ing.quantity) {
      parts.push(formatQuantity(ing.quantity));
    }

    if (ing.unit) {
      parts.push(ing.unit);
    }

    parts.push(ing.name);

    return parts.join(' ');
  };

  if (ingredients.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
        <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
          No ingredients listed
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {groupedIngredients.map(([category, items]) => (
        <View key={category} style={styles.categoryGroup}>
          {groupedIngredients.length > 1 && (
            <Text style={[styles.categoryTitle, isDark && styles.categoryTitleDark]}>
              {category}
            </Text>
          )}

          {items.map((ing, index) => (
            <View
              key={ing.id || `${category}-${index}`}
              style={[styles.ingredientRow, isDark && styles.ingredientRowDark]}
            >
              <View style={styles.bulletContainer}>
                <View
                  style={[styles.bullet, isDark && styles.bulletDark]}
                />
              </View>

              <Text
                style={[styles.ingredientText, isDark && styles.ingredientTextDark]}
              >
                {formatIngredient(ing)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyContainerDark: {
    backgroundColor: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
  categoryGroup: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryTitleDark: {
    color: '#9ca3af',
  },
  ingredientRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  ingredientRowDark: {
    // No background needed
  },
  bulletContainer: {
    paddingTop: 8,
    paddingRight: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  bulletDark: {
    backgroundColor: '#60a5fa',
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  ingredientTextDark: {
    color: '#f9fafb',
  },
  ingredientNotes: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  ingredientNotesDark: {
    color: '#9ca3af',
  },
});
