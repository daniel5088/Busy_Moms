import React, { useState } from 'react';
import { View, Text, SectionList, StyleSheet, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import type { Contact } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';
import { ContactCard } from './ContactCard';
import { EmptyState } from '../ui/EmptyState';

interface ContactListProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ContactList({ contacts, onEdit, onDelete, onRefresh, isRefreshing }: ContactListProps) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filteredContacts.reduce((acc, contact) => {
    const category = contact.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  const sections = Object.keys(grouped).map(category => ({
    title: category.charAt(0).toUpperCase() + category.slice(1),
    data: grouped[category] || [],
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.gray[300] }]}>
        <Search size={20} color={theme.colors.text.secondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search contacts..."
          placeholderTextColor={theme.colors.text.secondary}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ContactCard contact={item} onEdit={onEdit} onDelete={onDelete} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              {section.title}
            </Text>
          </View>
        )}
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        ListEmptyComponent={<EmptyState icon={<Search size={48} color={theme.colors.text.secondary} />} title="No contacts found" description="Try a different search term or add a new contact" />}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
});
