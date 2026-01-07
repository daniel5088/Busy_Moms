import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, ShoppingCart, Check } from 'lucide-react-native';
import { supabase, ShoppingItem } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function ShoppingScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadShoppingList();
    }
  }, [user?.id]);

  const loadShoppingList = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('completed', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!user?.id || !newItem.trim()) return;

    try {
      const { error } = await supabase.from('shopping_lists').insert({
        user_id: user.id,
        item: newItem.trim(),
        completed: false,
      });

      if (error) throw error;

      setNewItem('');
      setShowAddForm(false);
      loadShoppingList();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const toggleComplete = async (item: ShoppingItem) => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ completed: !item.completed })
        .eq('id', item.id);

      if (error) throw error;
      loadShoppingList();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      loadShoppingList();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ShoppingCart width={24} height={24} stroke="#1F2937" />
          <Text style={styles.headerTitle}>Shopping List</Text>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Plus width={24} height={24} stroke="#FFFFFF" />
        </Pressable>
      </View>

      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Add item..."
            value={newItem}
            onChangeText={setNewItem}
            autoFocus
            placeholderTextColor="#9CA3AF"
          />
          <Pressable style={styles.submitButton} onPress={addItem}>
            <Text style={styles.submitButtonText}>Add</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingCart width={48} height={48} stroke="#D1D5DB" />
            <Text style={styles.emptyText}>Your shopping list is empty</Text>
            <Text style={styles.emptySubtext}>Add items to get started</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Pressable
                style={styles.itemContent}
                onPress={() => toggleComplete(item)}
              >
                <View
                  style={[
                    styles.checkbox,
                    item.completed && styles.checkboxChecked,
                  ]}
                >
                  {item.completed && (
                    <Check width={16} height={16} stroke="#FFFFFF" />
                  )}
                </View>
                <View style={styles.itemDetails}>
                  <Text
                    style={[
                      styles.itemName,
                      item.completed && styles.itemNameCompleted,
                    ]}
                  >
                    {item.item}
                  </Text>
                  {(item.quantity || item.unit) && (
                    <Text style={styles.itemQuantity}>
                      {item.quantity} {item.unit}
                    </Text>
                  )}
                </View>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteItem(item.id)}
              >
                <Trash2 width={20} height={20} stroke="#EF4444" />
              </Pressable>
            </View>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 8,
  },
  addForm: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  itemNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  bottomPadding: {
    height: 24,
  },
});
