import { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { Button } from '../../src/components/ui/Button';
import { Modal } from '../../src/components/ui/Modal';
import { Input } from '../../src/components/ui/Input';
import { FormField } from '../../src/components/forms/FormField';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Badge } from '../../src/components/ui/Badge';
import { useToast } from '../../src/hooks/useToast';
import { useTheme } from '../../src/hooks/useTheme';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
}

export default function FamilyOnboardingScreen() {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const router = useRouter();

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');

  const handleAddMember = () => {
    if (!name.trim() || !relationship.trim()) {
      showToast('Please enter name and relationship', 'error');
      return;
    }

    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: name.trim(),
      relationship: relationship.trim(),
    };

    setFamilyMembers([...familyMembers, newMember]);
    setName('');
    setRelationship('');
    setShowAddModal(false);
    showToast('Family member added!', 'success');
  };

  const handleNext = () => {
    // In a real implementation, you would save the family members to the database
    // For now, we'll just proceed to the next step
    router.push('/(onboarding)/preferences');
  };

  const handleSkip = () => {
    router.push('/(onboarding)/preferences');
  };

  const renderFamilyMember = ({ item }: { item: FamilyMember }) => (
    <Card style={styles.memberCard}>
      <View style={styles.memberContent}>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.colors.text.primary }]}>
            {item.name}
          </Text>
          <Badge text={item.relationship} variant="neutral" />
        </View>
      </View>
    </Card>
  );

  return (
    <Screen style={{ backgroundColor: theme.colors.background.primary }}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Add Your Family Members
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            You can skip this step and add them later
          </Text>
        </View>

        <View style={styles.listContainer}>
          {familyMembers.length === 0 ? (
            <EmptyState
              title="No family members yet"
              description="Add family members to help organize your tasks and events"
              actionLabel="Add Family Member"
              onAction={() => setShowAddModal(true)}
            />
          ) : (
            <FlatList
              data={familyMembers}
              keyExtractor={(item) => item.id}
              renderItem={renderFamilyMember}
              contentContainerStyle={styles.list}
            />
          )}
        </View>

        <View style={styles.actions}>
          {familyMembers.length > 0 && (
            <Button
              title="Add Another"
              onPress={() => setShowAddModal(true)}
              variant="outline"
              fullWidth
            />
          )}
          <Button
            title={familyMembers.length > 0 ? 'Continue' : 'Skip for Now'}
            onPress={familyMembers.length > 0 ? handleNext : handleSkip}
            fullWidth
          />
        </View>
      </View>

      <Modal visible={showAddModal} onClose={() => setShowAddModal(false)} title="Add Family Member">
        <View style={styles.modalContent}>
          <FormField label="Name" required>
            <Input
              placeholder="e.g., Sarah"
              value={name}
              onChangeText={setName}
            />
          </FormField>

          <FormField label="Relationship" required>
            <Input
              placeholder="e.g., Daughter, Son, Spouse"
              value={relationship}
              onChangeText={setRelationship}
            />
          </FormField>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setShowAddModal(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              title="Add"
              onPress={handleAddMember}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
    marginBottom: 24,
  },
  list: {
    gap: 12,
  },
  memberCard: {
    padding: 16,
  },
  memberContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  modalContent: {
    gap: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
