import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShoppingItem } from '../../types/database';

interface ShoppingFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ShoppingFormData) => void;
  initialData?: ShoppingItem;
  loading?: boolean;
}

export interface ShoppingFormData {
  item: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  notes: string | null;
}

const CATEGORIES = [
  { value: 'produce', label: 'Produce', icon: 'leaf' },
  { value: 'dairy', label: 'Dairy', icon: 'water' },
  { value: 'meat', label: 'Meat & Seafood', icon: 'restaurant' },
  { value: 'pantry', label: 'Pantry', icon: 'cube' },
  { value: 'bakery', label: 'Bakery', icon: 'cafe' },
  { value: 'frozen', label: 'Frozen', icon: 'snow' },
  { value: 'beverages', label: 'Beverages', icon: 'wine' },
  { value: 'snacks', label: 'Snacks', icon: 'fast-food' },
  { value: 'household', label: 'Household', icon: 'home' },
  { value: 'personal_care', label: 'Personal Care', icon: 'heart' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export function ShoppingForm({
  visible,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: ShoppingFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [formData, setFormData] = useState<ShoppingFormData>({
    item: '',
    quantity: null,
    unit: null,
    category: 'other',
    notes: null,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        item: initialData.item,
        quantity: initialData.quantity ?? null,
        unit: initialData.unit ?? null,
        category: initialData.category || 'other',
        notes: initialData.notes ?? null,
      });
    } else {
      setFormData({
        item: '',
        quantity: null,
        unit: null,
        category: 'other',
        notes: null,
      });
    }
  }, [initialData, visible]);

  const handleSubmit = () => {
    if (!formData.item.trim()) {
      Alert.alert('Required Field', 'Please enter an item name');
      return;
    }

    onSubmit(formData);
  };

  const handleQuantityChange = (text: string) => {
    const value = text.trim();
    setFormData((prev) => ({
      ...prev,
      quantity: value ? parseFloat(value) || null : null,
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, isDark && styles.containerDark]}
      >
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, isDark && styles.textDark]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>
            {initialData ? 'Edit Item' : 'Add Item'}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.headerButton}
            disabled={loading}
          >
            <Text
              style={[
                styles.headerButtonText,
                styles.headerButtonTextPrimary,
                loading && styles.headerButtonTextDisabled,
              ]}
            >
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.labelDark]}>
              Item Name *
            </Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={formData.item}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, item: text }))}
              placeholder="e.g., Milk, Bread, Apples"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              autoFocus={!initialData}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Quantity</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={formData.quantity?.toString() || ''}
                onChangeText={handleQuantityChange}
                placeholder="e.g., 2"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.section, styles.halfWidth]}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Unit</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={formData.unit || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, unit: text || null }))
                }
                placeholder="e.g., lbs, cups"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.labelDark]}>Category</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    isDark && styles.categoryButtonDark,
                    formData.category === cat.value && styles.categoryButtonSelected,
                    formData.category === cat.value &&
                      isDark &&
                      styles.categoryButtonSelectedDark,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, category: cat.value }))
                  }
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={20}
                    color={
                      formData.category === cat.value
                        ? '#fff'
                        : isDark
                        ? '#9ca3af'
                        : '#6b7280'
                    }
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      isDark && styles.categoryTextDark,
                      formData.category === cat.value && styles.categoryTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.labelDark]}>
              Notes (Optional)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, isDark && styles.inputDark]}
              value={formData.notes || ''}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, notes: text || null }))
              }
              placeholder="Add any notes..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    borderBottomColor: '#374151',
  },
  headerButton: {
    minWidth: 70,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  headerButtonTextPrimary: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  headerButtonTextDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  textDark: {
    color: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  labelDark: {
    color: '#d1d5db',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  inputDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    color: '#f9fafb',
  },
  textArea: {
    minHeight: 80,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryButtonDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  categoryButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryButtonSelectedDark: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 6,
  },
  categoryTextDark: {
    color: '#9ca3af',
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
});
