import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServingsAdjuster } from './ServingsAdjuster';
import { IngredientList } from './IngredientList';
import type { Recipe, RecipeIngredient } from '../../types/database';

interface RecipeDetailProps {
  visible: boolean;
  recipe: Recipe | null;
  ingredients: RecipeIngredient[];
  onClose: () => void;
  onToggleSave?: (recipeId: string, isSaved: boolean) => void;
  onAddToShoppingList?: (ingredients: RecipeIngredient[], servings: number) => void;
  onSendToInstacart?: () => void;
  isSaved?: boolean;
  loading?: boolean;
}

export function RecipeDetail({
  visible,
  recipe,
  ingredients,
  onClose,
  onToggleSave,
  onAddToShoppingList,
  onSendToInstacart,
  isSaved = false,
  loading = false,
}: RecipeDetailProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [currentServings, setCurrentServings] = useState(recipe?.servings || 4);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>(
    'ingredients'
  );

  // Reset servings when recipe changes
  React.useEffect(() => {
    if (recipe) {
      setCurrentServings(recipe.servings || 4);
    }
  }, [recipe]);

  if (!recipe) {
    return null;
  }

  const handleAddToShoppingList = () => {
    if (!onAddToShoppingList) return;

    Alert.alert(
      'Add to Shopping List',
      `Add all ingredients for ${currentServings} servings?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => onAddToShoppingList(ingredients, currentServings),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={28}
              color={isDark ? '#f9fafb' : '#111827'}
            />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            {onToggleSave && (
              <TouchableOpacity
                onPress={() => onToggleSave(recipe.id, !isSaved)}
                style={styles.headerButton}
              >
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isSaved ? '#ef4444' : isDark ? '#d1d5db' : '#6b7280'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Image */}
          {recipe.image_url ? (
            <Image source={{ uri: recipe.image_url }} style={styles.heroImage} />
          ) : (
            <View
              style={[styles.heroImagePlaceholder, isDark && styles.heroImagePlaceholderDark]}
            >
              <Ionicons
                name="restaurant"
                size={64}
                color={isDark ? '#4b5563' : '#9ca3af'}
              />
            </View>
          )}

          {/* Title & Info */}
          <View style={styles.titleSection}>
            <Text style={[styles.title, isDark && styles.titleDark]}>
              {recipe.title}
            </Text>

            {recipe.description && (
              <Text style={[styles.description, isDark && styles.descriptionDark]}>
                {recipe.description}
              </Text>
            )}

            <View style={styles.metadata}>
              {recipe.cooking_time_minutes && (
                <View style={[styles.metadataItem, isDark && styles.metadataItemDark]}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={isDark ? '#60a5fa' : '#3b82f6'}
                  />
                  <Text style={[styles.metadataText, isDark && styles.metadataTextDark]}>
                    {recipe.cooking_time_minutes} min
                  </Text>
                </View>
              )}

              {recipe.cuisine && (
                <View style={[styles.metadataItem, isDark && styles.metadataItemDark]}>
                  <Ionicons
                    name="earth-outline"
                    size={18}
                    color={isDark ? '#60a5fa' : '#3b82f6'}
                  />
                  <Text style={[styles.metadataText, isDark && styles.metadataTextDark]}>
                    {recipe.cuisine}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Servings Adjuster */}
          <View style={styles.servingsSection}>
            <ServingsAdjuster
              servings={currentServings}
              onServingsChange={setCurrentServings}
            />
          </View>

          {/* Tabs */}
          <View style={[styles.tabs, isDark && styles.tabsDark]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'ingredients' && styles.tabActive,
                activeTab === 'ingredients' && isDark && styles.tabActiveDark,
              ]}
              onPress={() => setActiveTab('ingredients')}
            >
              <Text
                style={[
                  styles.tabText,
                  isDark && styles.tabTextDark,
                  activeTab === 'ingredients' && styles.tabTextActive,
                  activeTab === 'ingredients' && isDark && styles.tabTextActiveDark,
                ]}
              >
                Ingredients
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'instructions' && styles.tabActive,
                activeTab === 'instructions' && isDark && styles.tabActiveDark,
              ]}
              onPress={() => setActiveTab('instructions')}
            >
              <Text
                style={[
                  styles.tabText,
                  isDark && styles.tabTextDark,
                  activeTab === 'instructions' && styles.tabTextActive,
                  activeTab === 'instructions' && isDark && styles.tabTextActiveDark,
                ]}
              >
                Instructions
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.tabContent}>
            {activeTab === 'ingredients' && (
              <IngredientList
                ingredients={ingredients}
                originalServings={recipe.servings || 4}
                currentServings={currentServings}
              />
            )}

            {activeTab === 'instructions' && (
              <View style={styles.instructionsContainer}>
                {recipe.instructions && recipe.instructions.length > 0 ? (
                  recipe.instructions.map((instruction, index) => (
                    <View key={index} style={styles.instructionStep}>
                      <View
                        style={[
                          styles.stepNumber,
                          isDark && styles.stepNumberDark,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepNumberText,
                            isDark && styles.stepNumberTextDark,
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.instructionText,
                          isDark && styles.instructionTextDark,
                        ]}
                      >
                        {instruction}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                    No instructions available
                  </Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        {activeTab === 'ingredients' && onAddToShoppingList && (
          <View style={[styles.footer, isDark && styles.footerDark]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={handleAddToShoppingList}
              disabled={loading}
            >
              <Ionicons name="cart" size={20} color="#fff" />
              <Text style={styles.actionButtonTextPrimary}>
                Add to Shopping List
              </Text>
            </TouchableOpacity>

            {onSendToInstacart && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={onSendToInstacart}
                disabled={loading}
              >
                <Ionicons name="bag-handle" size={20} color="#10b981" />
                <Text style={styles.actionButtonTextSecondary}>
                  Send to Instacart
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
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
  closeButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  heroImagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImagePlaceholderDark: {
    backgroundColor: '#374151',
  },
  titleSection: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  titleDark: {
    color: '#f9fafb',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  descriptionDark: {
    color: '#9ca3af',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  metadataItemDark: {
    backgroundColor: '#1f2937',
  },
  metadataText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },
  metadataTextDark: {
    color: '#d1d5db',
  },
  servingsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabActiveDark: {
    borderBottomColor: '#60a5fa',
  },
  tabText: {
    fontSize: 16,
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
  tabContent: {
    padding: 16,
    minHeight: 200,
  },
  instructionsContainer: {
    gap: 20,
  },
  instructionStep: {
    flexDirection: 'row',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberDark: {
    backgroundColor: '#1e3a8a',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  stepNumberTextDark: {
    color: '#60a5fa',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  instructionTextDark: {
    color: '#f9fafb',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 32,
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  footerDark: {
    borderTopColor: '#374151',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonSecondary: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  actionButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
  },
});
