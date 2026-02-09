import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import {
  ShoppingCart,
  Check,
  Users,
  Settings,
  Calendar,
  // @ts-ignore
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useQuickActions } from '../../hooks/useQuickActions';
import { UserQuickAction } from '../../services/quickActionsService';
import { useRouter } from 'expo-router';

// Map icon names to Lucide components - using only available icons
const iconMap: Record<string, typeof ShoppingCart> = {
  'shopping-cart': ShoppingCart,
  'check-square': Check,
  users: Users,
  'folder-open': Users, // Fallback
  settings: Settings,
  link: Users, // Fallback
  'file-text': Users, // Fallback
  gift: Users, // Fallback
  utensils: ShoppingCart, // Fallback
  calendar: Calendar,
  mic: Users, // Fallback
};

// Map action types to routes
const routeMap: Record<string, string> = {
  shopping: '/(tabs)/shopping',
  tasks: '/tasks',
  contacts: '/contacts',
  'family-folders': '/family-folders',
  settings: '/settings',
  'quick-links': '/quick-links',
  'life-receipts': '/life-receipts',
  'gift-finder': '/gift-finder',
  recipes: '/(tabs)/shopping?tab=recipes',
  'cycle-tracker': '/cycle-tracker',
  'voice-chat': '/voice-chat',
};

interface QuickActionsGridProps {
  onCustomizePress?: () => void;
}

export function QuickActionsGrid({ onCustomizePress }: QuickActionsGridProps) {
  const { theme } = useTheme();
  const { quickActions, loading } = useQuickActions();
  const router = useRouter();

  const handleActionPress = (action: UserQuickAction) => {
    const actionId = action.action_type?.name.toLowerCase().replace(/\s+/g, '-') || '';
    const route = routeMap[actionId];

    if (route) {
      router.push(route as any);
    } else {
      console.warn(`No route defined for action: ${actionId}`);
    }
  };

  const renderQuickAction = ({ item }: { item: UserQuickAction }) => {
    const actionType = item.action_type;
    if (!actionType) return null;

    const IconComponent = iconMap[actionType.icon] || ShoppingCart;
    const gradientFrom = actionType.gradient_from || theme.colors.primary.main;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: gradientFrom,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => handleActionPress(item)}
      >
        <View style={styles.actionIconContainer}>
          {/* @ts-ignore */}
          <IconComponent size={24} color="#ffffff" />
        </View>
        <Text style={styles.actionLabel} numberOfLines={1}>
          {actionType.name}
        </Text>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Quick Actions
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Quick Actions
        </Text>
        {onCustomizePress && (
          <Pressable onPress={onCustomizePress}>
            <Text style={[styles.customizeText, { color: theme.colors.primary.main }]}>
              Customize
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={quickActions}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={renderQuickAction}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  customizeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 8,
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    maxWidth: '31%',
    aspectRatio: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconContainer: {
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
