import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ExternalLink, Plus } from 'lucide-react-native';
import { useTheme } from '../src/hooks/useTheme';
import { Screen } from '../src/components/layout/Screen';
import { EmptyState } from '../src/components/ui/EmptyState';
import { useQuickActions } from '../src/hooks/useQuickActions';
import { UserQuickAction } from '../src/services/quickActionsService';

export default function QuickLinksScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { quickActions, loading } = useQuickActions();

  const handleLinkPress = async (action: UserQuickAction) => {
    const actionId = action.action_type?.name.toLowerCase().replace(/\s+/g, '-') || '';
    const route = actionId; // Simplified - use action ID as route
    if (route.startsWith('http://') || route.startsWith('https://')) {
      // External URL
      try {
        const supported = await Linking.canOpenURL(route);
        if (supported) {
          await Linking.openURL(route);
        } else {
          Alert.alert('Error', 'Cannot open this URL');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open link');
        console.error('Error opening link:', error);
      }
    } else {
      // Internal route
      try {
        router.push(route as any);
      } catch (error) {
        Alert.alert('Error', 'Cannot navigate to this screen');
        console.error('Navigation error:', error);
      }
    }
  };

  const quickLinks = quickActions.filter((action) => action.action_type?.name !== undefined);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Quick Links',
        }}
      />
      <Screen>
        <View style={styles.container}>
          {quickLinks.length === 0 && !loading ? (
            <EmptyState
              title="No quick links"
              description="Add quick links from your dashboard to access them here"
            />
          ) : (
            <FlatList
              data={quickLinks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleLinkPress(item)}
                  style={({ pressed }) => [
                    styles.linkCard,
                    {
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: theme.colors.border.default,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={styles.linkContent}>
                    <Text style={[styles.linkTitle, { color: theme.colors.text.primary }]}>
                      {item.action_type?.name || 'Unknown'}
                    </Text>
                    {item.action_type?.description && (
                      <Text
                        style={[styles.linkDescription, { color: theme.colors.text.secondary }]}
                        numberOfLines={2}
                      >
                        {item.action_type.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.iconContainer}>
                    <ExternalLink
                      size={20}
                      color={theme.colors.primary.main}
                      // @ts-ignore
                      strokeWidth={2}
                    />
                  </View>
                </Pressable>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 14,
  },
  iconContainer: {
    marginLeft: 12,
  },
});
