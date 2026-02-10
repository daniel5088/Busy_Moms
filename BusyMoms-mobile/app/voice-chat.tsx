import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { VoiceChat } from '../src/components/ai/VoiceChat';
import { useTheme } from '../src/hooks/useTheme';
import { aiChatService } from '../src/services/aiChatService';

export default function VoiceChatScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const handleClearChat = () => {
    aiChatService.clearHistory();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      edges={['top']}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background.card,
            borderBottomColor: theme.colors.border.default,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft color={theme.colors.primary.main} size={22} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          AI Assistant
        </Text>
        <Pressable
          onPress={handleClearChat}
          style={styles.clearButton}
          accessibilityLabel="Clear chat"
          accessibilityRole="button"
        >
          <Trash2 color={theme.colors.text.secondary} size={18} />
        </Pressable>
      </View>

      {/* Chat */}
      <VoiceChat />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  clearButton: {
    padding: 4,
  },
});
