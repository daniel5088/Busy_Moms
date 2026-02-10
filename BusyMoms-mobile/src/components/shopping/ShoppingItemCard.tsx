import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShoppingItem } from '../../types/database';

interface ShoppingItemCardProps {
  item: ShoppingItem;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
}

export function ShoppingItemCard({
  item,
  onToggle,
  onEdit,
  onDelete,
}: ShoppingItemCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleToggle = () => {
    onToggle(item.id, !item.completed);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={handleToggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={item.completed ? '#10b981' : isDark ? '#9ca3af' : '#6b7280'}
        />
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text
          style={[
            styles.itemName,
            isDark && styles.textDark,
            item.completed && styles.completedText,
          ]}
          numberOfLines={2}
        >
          {item.item}
        </Text>

        {(item.quantity || item.unit) && (
          <Text
            style={[
              styles.quantityText,
              isDark && styles.quantityTextDark,
              item.completed && styles.completedText,
            ]}
          >
            {item.quantity && `${item.quantity} `}
            {item.unit || ''}
          </Text>
        )}

        {item.provider_name === 'instacart' && item.purchase_status === 'in_cart' && (
          <View style={styles.providerBadge}>
            <Ionicons name="cart" size={12} color="#10b981" />
            <Text style={styles.providerText}>In Instacart Cart</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="pencil"
            size={18}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={isDark ? '#ef4444' : '#dc2626'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  containerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  textDark: {
    color: '#f9fafb',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  quantityTextDark: {
    color: '#9ca3af',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  providerText: {
    fontSize: 12,
    color: '#065f46',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
});
