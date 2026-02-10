import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking, Alert } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { EmptyState } from '../ui/EmptyState';
import { AffiliateMatrixItem } from '../../services/affiliateMatrixService';
import { Loader2 } from 'lucide-react-native';

interface AffiliateResultsProps {
  results: AffiliateMatrixItem[];
  isLoading: boolean;
  onReset: () => void;
}

export function AffiliateResults({ results, isLoading, onReset }: AffiliateResultsProps) {
  const { theme } = useTheme();

  const handleLinkPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
      console.error('Error opening link:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader2
          size={32}
          color={theme.colors.primary.main}
          // @ts-ignore
          className="animate-spin"
        />
        <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
          Searching for gifts...
        </Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title="No results found"
        description="Try adjusting your search criteria to find more gift ideas"
        actionLabel="Reset Search"
        onAction={onReset}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: theme.colors.text.primary }]}>
        Gift Suggestions ({results.length})
      </Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleLinkPress(item.affiliate_url)}
            style={({ pressed }) => [
              styles.resultCard,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.border.default,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.resultContent}>
              <Text style={[styles.searchPhrase, { color: theme.colors.text.primary }]}>
                {item.search_phrase}
              </Text>
              <View style={styles.details}>
                <Text
                  style={[styles.detailText, { color: theme.colors.text.secondary }]}
                  numberOfLines={1}
                >
                  {item.relationship_label} • {item.age_group_label}
                </Text>
                <Text
                  style={[styles.detailText, { color: theme.colors.text.secondary }]}
                  numberOfLines={1}
                >
                  {item.gender_label} • {item.budget_label}
                </Text>
              </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  resultContent: {
    flex: 1,
  },
  searchPhrase: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  details: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  iconContainer: {
    marginLeft: 12,
  },
});
