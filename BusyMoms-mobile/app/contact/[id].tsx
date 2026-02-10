import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContact, useUpdateContact, useDeleteContact } from '../../src/hooks/useContacts';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { ContactForm } from '../../src/components/contacts/ContactForm';
import { Loading } from '../../src/components/ui/Loading';
import { Trash2 } from 'lucide-react-native';
import type { Contact } from '../../src/types/database';
import type { UpdateContactInput } from '../../src/services/contactService';
// @ts-ignore
import { Button } from '../../src/components/ui/Button';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const { data: contact, isLoading } = useContact(id, user?.id || '');
  const updateContact = useUpdateContact(user?.id || '');
  const deleteContact = useDeleteContact(user?.id || '');

  const handleDelete = () => {
    Alert.alert('Delete Contact', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteContact.mutateAsync(id);
        router.back();
      }},
    ]);
  };

  const handleUpdate = async (updates: Partial<Contact>) => {
    await updateContact.mutateAsync({ contactId: id, updates: updates as UpdateContactInput });
    setIsEditModalVisible(false);
  };

  if (isLoading) return <Screen><Header title="Contact" onBack={() => router.back()} /><Loading /></Screen>;
  if (!contact) return <Screen><Header title="Contact" onBack={() => router.back()} /></Screen>;

  return (
    <Screen>
      <Header title={contact.name} onBack={() => router.back()} rightAction={
        <Button title="" icon={<Trash2 size={20} color={theme.colors.status.error} />} onPress={handleDelete} variant="ghost" loading={deleteContact.isPending} />
      } />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Button title="Edit Contact" onPress={() => setIsEditModalVisible(true)} />
      </ScrollView>
      <ContactForm isVisible={isEditModalVisible} onClose={() => setIsEditModalVisible(false)} onSubmit={handleUpdate} editContact={contact} isLoading={updateContact.isPending} />
    </Screen>
  );
}
