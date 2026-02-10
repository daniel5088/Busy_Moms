import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import { ExtractedReceiptInfo } from '../../services/lifeReceiptsAIService';
import { FormField } from '../forms/FormField';
import { Select } from '../ui/Select';

interface TriageFlowProps {
  extractedInfo: ExtractedReceiptInfo;
  onConfirm: (finalInfo: ExtractedReceiptInfo) => void;
  onCancel: () => void;
}

const WHERE_OPTIONS = [
  { label: 'Unknown', value: 'unknown' },
  { label: 'Home', value: 'home' },
  { label: 'Work', value: 'work' },
  { label: 'School', value: 'school' },
  { label: 'Store', value: 'store' },
  { label: 'Online', value: 'online' },
  { label: 'Phone', value: 'phone' },
  { label: 'Email', value: 'email' },
];

const WHO_OPTIONS = [
  { label: 'Unknown', value: 'unknown' },
  { label: 'Me', value: 'me' },
  { label: 'Partner', value: 'partner' },
  { label: 'Kids', value: 'kids' },
  { label: 'Family', value: 'family' },
  { label: 'Friend', value: 'friend' },
  { label: 'Colleague', value: 'colleague' },
  { label: 'Service Provider', value: 'provider' },
];

const WHEN_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Later', value: 'later' },
  { label: 'Someday', value: 'someday' },
];

const OBLIGATION_OPTIONS = [
  { label: 'Unknown', value: 'unknown' },
  { label: 'Must Do', value: 'must' },
  { label: 'Should Do', value: 'should' },
  { label: 'Nice to Do', value: 'nice' },
  { label: 'Just Info', value: 'info' },
];

export function TriageFlow({ extractedInfo, onConfirm, onCancel }: TriageFlowProps) {
  const { theme } = useTheme();
  const [content, setContent] = useState(extractedInfo.content);
  const [where, setWhere] = useState(extractedInfo.where || 'unknown');
  const [who, setWho] = useState(extractedInfo.who || 'unknown');
  const [when, setWhen] = useState(extractedInfo.when || 'someday');
  const [obligation, setObligation] = useState(extractedInfo.obligation || 'unknown');

  const handleConfirm = () => {
    onConfirm({
      content,
      where,
      who,
      when,
      obligation,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Review & Edit Receipt
      </Text>

      <FormField label="Content" required>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.default,
              color: theme.colors.text.primary,
            },
          ]}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </FormField>

      <FormField label="Where">
        <Select
          value={where}
          onChange={setWhere}
          options={WHERE_OPTIONS}
          placeholder="Select location"
        />
      </FormField>

      <FormField label="Who">
        <Select
          value={who}
          onChange={setWho}
          options={WHO_OPTIONS}
          placeholder="Select person"
        />
      </FormField>

      <FormField label="When">
        <Select
          value={when}
          onChange={setWhen}
          options={WHEN_OPTIONS}
          placeholder="Select timeframe"
        />
      </FormField>

      <FormField label="Obligation">
        <Select
          value={obligation}
          onChange={setObligation}
          options={OBLIGATION_OPTIONS}
          placeholder="Select priority"
        />
      </FormField>

      <View style={styles.buttonRow}>
        <Button title="Cancel" variant="secondary" onPress={onCancel} style={styles.buttonHalf} />
        <Button title="Save Receipt" onPress={handleConfirm} style={styles.buttonHalf} disabled={!content.trim()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  buttonHalf: {
    flex: 1,
  },
});
