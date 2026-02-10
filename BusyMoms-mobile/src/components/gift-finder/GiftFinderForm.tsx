import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import { FormField } from '../forms/FormField';
import { Select } from '../ui/Select';
import { useAffiliateMatrix } from '../../hooks/useAffiliateMatrix';
import { AffiliateSearchCriteria } from '../../services/affiliateMatrixService';
import { Loader2 } from 'lucide-react-native';

interface GiftFinderFormProps {
  onSearch: (criteria: AffiliateSearchCriteria) => void;
}

export function GiftFinderForm({ onSearch }: GiftFinderFormProps) {
  const { theme } = useTheme();
  const { lookupValues, isLoading } = useAffiliateMatrix();

  const [relationship, setRelationship] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const [budget, setBudget] = useState('');

  const handleSearch = () => {
    const criteria: AffiliateSearchCriteria = {};

    if (relationship) criteria.relationship_key = relationship;
    if (ageGroup) criteria.age_group_key = ageGroup;
    if (gender) criteria.gender_key = gender;
    if (budget) criteria.budget_key = budget;

    onSearch(criteria);
  };

  const canSearch = relationship || ageGroup || gender || budget;

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
          Loading gift options...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Find the Perfect Gift
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Select criteria to get personalized gift suggestions
      </Text>

      <FormField label="Relationship (Optional)">
        <Select
          value={relationship}
          onChange={setRelationship}
          options={[
            { label: 'Any', value: '' },
            ...(lookupValues?.relationships.map((r) => ({
              label: r.label,
              value: r.key,
            })) || []),
          ]}
          placeholder="Select relationship"
        />
      </FormField>

      <FormField label="Age Group (Optional)">
        <Select
          value={ageGroup}
          onChange={setAgeGroup}
          options={[
            { label: 'Any', value: '' },
            ...(lookupValues?.ageGroups.map((a) => ({
              label: a.label,
              value: a.key,
            })) || []),
          ]}
          placeholder="Select age group"
        />
      </FormField>

      <FormField label="Gender (Optional)">
        <Select
          value={gender}
          onChange={setGender}
          options={[
            { label: 'Any', value: '' },
            ...(lookupValues?.genders.map((g) => ({
              label: g.label,
              value: g.key,
            })) || []),
          ]}
          placeholder="Select gender"
        />
      </FormField>

      <FormField label="Budget (Optional)">
        <Select
          value={budget}
          onChange={setBudget}
          options={[
            { label: 'Any', value: '' },
            ...(lookupValues?.budgets.map((b) => ({
              label: b.label,
              value: b.key,
            })) || []),
          ]}
          placeholder="Select budget"
        />
      </FormField>

      <Button title="Find Gifts" onPress={handleSearch} disabled={!canSearch} style={styles.searchButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  searchButton: {
    marginTop: 16,
  },
});
