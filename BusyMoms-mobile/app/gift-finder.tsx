import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { GiftFinderForm } from '../src/components/gift-finder/GiftFinderForm';
import { AffiliateResults } from '../src/components/gift-finder/AffiliateResults';
import {
  AffiliateSearchCriteria,
  AffiliateMatrixItem,
} from '../src/services/affiliateMatrixService';
import { useAffiliateSearch } from '../src/hooks/useAffiliateMatrix';

export default function GiftFinderScreen() {
  const [criteria, setCriteria] = useState<AffiliateSearchCriteria>({});
  const [hasSearched, setHasSearched] = useState(false);

  const { results, isLoading } = useAffiliateSearch(criteria, hasSearched);

  const handleSearch = (newCriteria: AffiliateSearchCriteria) => {
    setCriteria(newCriteria);
    setHasSearched(true);
  };

  const handleReset = () => {
    setCriteria({});
    setHasSearched(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gift Finder',
          presentation: 'modal',
        }}
      />
      <Screen>
        <View style={styles.container}>
          {!hasSearched ? (
            <GiftFinderForm onSearch={handleSearch} />
          ) : (
            <AffiliateResults results={results} isLoading={isLoading} onReset={handleReset} />
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
});
