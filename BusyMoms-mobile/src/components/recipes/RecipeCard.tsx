import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Recipe } from '../../types/database';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: (recipe: Recipe) => void;
  onToggleSave?: (recipeId: string, isSaved: boolean) => void;
  isSaved?: boolean;
}

export function RecipeCard({
  recipe,
  onPress,
  onToggleSave,
  isSaved = false,
}: RecipeCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSavePress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onToggleSave?.(recipe.id, !isSaved);
  };

  return (
    <TouchableOpacity
      style={[styles.card, isDark && styles.cardDark]}
      onPress={() => onPress(recipe)}
      activeOpacity={0.8}
    >
      {recipe.image_url ? (
        <Image source={{ uri: recipe.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.imagePlaceholder, isDark && styles.imagePlaceholderDark]}>
          <Ionicons
            name="restaurant"
            size={48}
            color={isDark ? '#4b5563' : '#9ca3af'}
          />
        </View>
      )}

      {onToggleSave && (
        <TouchableOpacity
          style={[styles.saveButton, isDark && styles.saveButtonDark]}
          onPress={handleSavePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={22}
            color={isSaved ? '#ef4444' : isDark ? '#d1d5db' : '#6b7280'}
          />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        <Text
          style={[styles.title, isDark && styles.titleDark]}
          numberOfLines={2}
        >
          {recipe.title}
        </Text>

        {recipe.description && (
          <Text
            style={[styles.description, isDark && styles.descriptionDark]}
            numberOfLines={2}
          >
            {recipe.description}
          </Text>
        )}

        <View style={styles.metadata}>
          {recipe.cooking_time_minutes && (
            <View style={styles.metadataItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
              <Text style={[styles.metadataText, isDark && styles.metadataTextDark]}>
                {recipe.cooking_time_minutes} min
              </Text>
            </View>
          )}

          {recipe.servings && (
            <View style={styles.metadataItem}>
              <Ionicons
                name="people-outline"
                size={14}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
              <Text style={[styles.metadataText, isDark && styles.metadataTextDark]}>
                {recipe.servings} servings
              </Text>
            </View>
          )}

          {recipe.cuisine && (
            <View style={styles.metadataItem}>
              <Ionicons
                name="earth-outline"
                size={14}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
              <Text style={[styles.metadataText, isDark && styles.metadataTextDark]}>
                {recipe.cuisine}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#1f2937',
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderDark: {
    backgroundColor: '#374151',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDark: {
    backgroundColor: '#1f2937',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  titleDark: {
    color: '#f9fafb',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  descriptionDark: {
    color: '#9ca3af',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  metadataTextDark: {
    color: '#9ca3af',
  },
});
