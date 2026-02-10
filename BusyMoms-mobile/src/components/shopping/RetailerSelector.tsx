import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Retailer, UserPreferredRetailer } from '../../types/database';

interface RetailerSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectRetailer: (retailerKey: string) => void;
  preferredRetailers: UserPreferredRetailer[];
  onSearchRetailers: (postalCode: string) => void;
  searchResults: Retailer[];
  loading?: boolean;
}

export function RetailerSelector({
  visible,
  onClose,
  onSelectRetailer,
  preferredRetailers,
  onSearchRetailers,
  searchResults,
  loading = false,
}: RetailerSelectorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [postalCode, setPostalCode] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowSearch(false);
      setPostalCode('');
    }
  }, [visible]);

  const handleSearch = () => {
    if (postalCode.trim().length >= 5) {
      onSearchRetailers(postalCode.trim());
      setShowSearch(true);
    }
  };

  const handleSelectRetailer = (retailerKey: string) => {
    onSelectRetailer(retailerKey);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={28}
              color={isDark ? '#f9fafb' : '#111827'}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>
            Select Retailer
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Preferred Retailers */}
          {preferredRetailers.length > 0 && !showSearch && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Your Preferred Retailers
              </Text>
              {preferredRetailers.map((retailer) => (
                <TouchableOpacity
                  key={retailer.id}
                  style={[styles.retailerCard, isDark && styles.retailerCardDark]}
                  onPress={() => handleSelectRetailer(retailer.retailer_key)}
                >
                  {retailer.retailer_logo_url ? (
                    <Image
                      source={{ uri: retailer.retailer_logo_url }}
                      style={styles.retailerLogo}
                    />
                  ) : (
                    <View
                      style={[
                        styles.retailerLogoPlaceholder,
                        isDark && styles.retailerLogoPlaceholderDark,
                      ]}
                    >
                      <Ionicons
                        name="storefront"
                        size={24}
                        color={isDark ? '#60a5fa' : '#3b82f6'}
                      />
                    </View>
                  )}

                  <View style={styles.retailerInfo}>
                    <Text style={[styles.retailerName, isDark && styles.textDark]}>
                      {retailer.retailer_name}
                    </Text>
                    {retailer.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.primaryText}>Primary</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isDark ? '#6b7280' : '#9ca3af'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Search Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              {showSearch ? 'Search Results' : 'Find Nearby Retailers'}
            </Text>

            {!showSearch && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={[styles.searchInput, isDark && styles.searchInputDark]}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="Enter ZIP/Postal Code"
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={[
                    styles.searchButton,
                    (!postalCode.trim() || postalCode.trim().length < 5) &&
                      styles.searchButtonDisabled,
                  ]}
                  onPress={handleSearch}
                  disabled={!postalCode.trim() || postalCode.trim().length < 5}
                >
                  <Ionicons name="search" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {showSearch && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowSearch(false)}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={isDark ? '#60a5fa' : '#3b82f6'}
                />
                <Text style={styles.backButtonText}>Back to preferred retailers</Text>
              </TouchableOpacity>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={[styles.loadingText, isDark && styles.textDark]}>
                  Finding nearby retailers...
                </Text>
              </View>
            )}

            {showSearch && !loading && searchResults.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="storefront-outline"
                  size={48}
                  color={isDark ? '#6b7280' : '#9ca3af'}
                />
                <Text style={[styles.emptyText, isDark && styles.textDark]}>
                  No retailers found in this area
                </Text>
              </View>
            )}

            {showSearch &&
              !loading &&
              searchResults.map((retailer) => (
                <TouchableOpacity
                  key={retailer.retailer_key}
                  style={[styles.retailerCard, isDark && styles.retailerCardDark]}
                  onPress={() => handleSelectRetailer(retailer.retailer_key)}
                >
                  {retailer.retailer_logo_url ? (
                    <Image
                      source={{ uri: retailer.retailer_logo_url }}
                      style={styles.retailerLogo}
                    />
                  ) : (
                    <View
                      style={[
                        styles.retailerLogoPlaceholder,
                        isDark && styles.retailerLogoPlaceholderDark,
                      ]}
                    >
                      <Ionicons
                        name="storefront"
                        size={24}
                        color={isDark ? '#60a5fa' : '#3b82f6'}
                      />
                    </View>
                  )}

                  <View style={styles.retailerInfo}>
                    <Text style={[styles.retailerName, isDark && styles.textDark]}>
                      {retailer.name}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isDark ? '#6b7280' : '#9ca3af'}
                  />
                </TouchableOpacity>
              ))}
          </View>
        </ScrollView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    borderBottomColor: '#374151',
  },
  closeButton: {
    padding: 4,
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
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: '#f9fafb',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  searchInputDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    color: '#f9fafb',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 6,
  },
  retailerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  retailerCardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  retailerLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  retailerLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  retailerLogoPlaceholderDark: {
    backgroundColor: '#1e3a8a',
  },
  retailerInfo: {
    flex: 1,
  },
  retailerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: {
    fontSize: 12,
    color: '#f59e0b',
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
});
