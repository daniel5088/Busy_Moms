/**
 * Component Showcase - temporary screen to visualize all UI components
 * This file can be removed after Phase 2 testing
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Screen } from '../src/components/layout/Screen';
import { Header } from '../src/components/layout/Header';
import { Section } from '../src/components/layout/Section';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Input } from '../src/components/ui/Input';
import { Modal } from '../src/components/ui/Modal';
import { Badge } from '../src/components/ui/Badge';
import { Avatar } from '../src/components/ui/Avatar';
import { Skeleton } from '../src/components/ui/Skeleton';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Divider } from '../src/components/ui/Divider';
import { Switch } from '../src/components/ui/Switch';
import { Select } from '../src/components/ui/Select';
import { Chip } from '../src/components/ui/Chip';
import { ProgressBar } from '../src/components/ui/ProgressBar';
import { FloatingActionButton } from '../src/components/ui/FloatingActionButton';
import { FormField } from '../src/components/forms/FormField';
import { SearchInput } from '../src/components/forms/SearchInput';
import { useTheme } from '../src/hooks/useTheme';
import { useToast } from '../src/hooks/useToast';
import { useRouter } from 'expo-router';

export default function ComponentShowcaseScreen() {
  const router = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  const { showToast } = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [switchValue, setSwitchValue] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  const selectOptions = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ];

  return (
    <Screen scrollable>
      <Header title="Component Showcase" onBack={() => router.back()} />

      <View style={{ padding: theme.spacing.base }}>
        {/* Theme Toggle */}
        <Section title="Theme">
          <Card>
            <Switch
              label={`Dark Mode: ${isDark ? 'ON' : 'OFF'}`}
              value={isDark}
              onValueChange={toggleTheme}
            />
          </Card>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <Card style={{ gap: theme.spacing.sm }}>
            <Button title="Primary Button" onPress={() => showToast('Primary clicked!')} />
            <Button
              title="Secondary Button"
              variant="secondary"
              onPress={() => showToast('Secondary clicked!')}
            />
            <Button
              title="Outline Button"
              variant="outline"
              onPress={() => showToast('Outline clicked!')}
            />
            <Button
              title="Ghost Button"
              variant="ghost"
              onPress={() => showToast('Ghost clicked!')}
            />
            <Button
              title="Danger Button"
              variant="danger"
              onPress={() => showToast('Danger clicked!', 'error')}
            />
            <Button title="Loading Button" loading onPress={() => {}} />
            <Button title="Disabled Button" disabled onPress={() => {}} />
          </Card>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <Card onPress={() => showToast('Card pressed!')}>
            <Text style={{ color: theme.colors.text.primary }}>Pressable Card</Text>
          </Card>
          <Card noShadow style={{ marginTop: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.text.primary }}>Card without shadow</Text>
          </Card>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <Card style={{ gap: theme.spacing.md }}>
            <Input
              label="Text Input"
              placeholder="Enter text..."
              value={inputValue}
              onChangeText={setInputValue}
            />
            <Input
              label="Input with Error"
              placeholder="Enter text..."
              value=""
              error="This field is required"
            />
            <Input
              label="Input with Helper Text"
              placeholder="Enter text..."
              value=""
              helperText="This is helper text"
            />
          </Card>
        </Section>

        {/* Search Input */}
        <Section title="Search Input">
          <SearchInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search..."
          />
        </Section>

        {/* Modal */}
        <Section title="Modal">
          <Button title="Open Modal" onPress={() => setModalVisible(true)} />
          <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title="Modal Title">
            <Text style={{ color: theme.colors.text.primary }}>This is modal content</Text>
            <Button
              title="Close"
              onPress={() => setModalVisible(false)}
              variant="outline"
              style={{ marginTop: theme.spacing.md }}
            />
          </Modal>
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Badge text="Primary" variant="primary" />
            <Badge text="Success" variant="success" />
            <Badge text="Warning" variant="warning" />
            <Badge text="Danger" variant="danger" />
            <Badge text="Neutral" variant="neutral" />
          </View>
        </Section>

        {/* Avatars */}
        <Section title="Avatars">
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Avatar name="John Doe" size={40} />
            <Avatar name="Jane Smith" size={56} />
            <Avatar name="AB" size={72} />
          </View>
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton Loaders">
          <Card style={{ gap: theme.spacing.sm }}>
            <Skeleton width="100%" height={20} />
            <Skeleton width="80%" height={20} />
            <Skeleton width="60%" height={20} />
          </Card>
        </Section>

        {/* Divider */}
        <Section title="Dividers">
          <Card style={{ gap: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text.primary }}>Above divider</Text>
            <Divider />
            <Text style={{ color: theme.colors.text.primary }}>Below divider</Text>
            <Divider label="OR" />
            <Text style={{ color: theme.colors.text.primary }}>Below labeled divider</Text>
          </Card>
        </Section>

        {/* Switch */}
        <Section title="Switch">
          <Card>
            <Switch label="Toggle Option" value={switchValue} onValueChange={setSwitchValue} />
          </Card>
        </Section>

        {/* Select */}
        <Section title="Select">
          <Select
            label="Select an option"
            options={selectOptions}
            value={selectValue}
            onChange={setSelectValue}
          />
        </Section>

        {/* Chips */}
        <Section title="Chips">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Chip label="Default" />
            <Chip label="Primary" variant="primary" />
            <Chip label="Secondary" variant="secondary" />
            <Chip label="Selected" selected onPress={() => showToast('Chip pressed!')} />
          </View>
        </Section>

        {/* Progress Bar */}
        <Section title="Progress Bar">
          <Card style={{ gap: theme.spacing.md }}>
            <ProgressBar progress={0.3} />
            <ProgressBar progress={0.6} />
            <ProgressBar progress={1} color={theme.colors.status.success} />
          </Card>
        </Section>

        {/* Empty State */}
        <Section title="Empty State">
          <Card style={{ minHeight: 200 }}>
            <EmptyState
              title="No items"
              description="There are no items to display"
              actionLabel="Add Item"
              onAction={() => showToast('Add item clicked!')}
            />
          </Card>
        </Section>

        {/* Form Field */}
        <Section title="Form Field">
          <FormField label="Email" required error="Email is required">
            <Input placeholder="email@example.com" value="" />
          </FormField>
        </Section>

        {/* Toast Examples */}
        <Section title="Toasts">
          <Card style={{ gap: theme.spacing.sm }}>
            <Button
              title="Show Success Toast"
              onPress={() => showToast('Success message!', 'success')}
            />
            <Button
              title="Show Warning Toast"
              onPress={() => showToast('Warning message!', 'warning')}
            />
            <Button
              title="Show Error Toast"
              onPress={() => showToast('Error message!', 'error')}
            />
            <Button
              title="Show Info Toast"
              onPress={() => showToast('Info message!', 'info')}
            />
          </Card>
        </Section>

        {/* Add bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </View>

      <FloatingActionButton
        icon={<Text style={{ color: '#FFFFFF', fontSize: 24 }}>+</Text>}
        onPress={() => showToast('FAB pressed!')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({});
