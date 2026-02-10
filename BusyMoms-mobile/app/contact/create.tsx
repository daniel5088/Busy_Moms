import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateContact } from '../../src/hooks/useContacts';
import { useAuth } from '../../src/hooks/useAuth';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { ContactForm } from '../../src/components/contacts/ContactForm';
import type { Contact } from '../../src/types/database';
import type { CreateContactInput } from '../../src/services/contactService';

export default function CreateContactScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const createContact = useCreateContact(user?.id || '');

  const handleSubmit = async (data: Partial<Contact>) => {
    await createContact.mutateAsync(data as CreateContactInput);
    router.back();
  };

  return (
    <Screen>
      <Header title="Create Contact" onBack={() => router.back()} />
      <View style={{ flex: 1, padding: 16 }}>
        <ContactForm isVisible={true} onClose={() => router.back()} onSubmit={handleSubmit} isLoading={createContact.isPending} />
      </View>
    </Screen>
  );
}
