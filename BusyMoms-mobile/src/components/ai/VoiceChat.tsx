import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
// @ts-ignore
import { Send as SendIcon } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { ChatBubble } from './ChatBubble';
import { VoiceRecorder } from './VoiceRecorder';
import { aiChatService, ChatMessage } from '../../services/aiChatService';
import { aiVoiceService } from '../../services/aiVoiceService';
import { logger } from '../../utils/logger';

export function VoiceChat() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const mountedRef = useRef(true);

  // Track mounted state and cleanup recording on unmount
  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
      aiVoiceService.cancelRecording();
    };
  }, []);

  const addWelcomeMessage = useCallback(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hi there! I'm your family assistant. I can help you manage schedules, tasks, shopping lists, and more. How can I help you today?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [messages.length]);

  // Show welcome message on mount
  React.useEffect(() => {
    addWelcomeMessage();
  }, [addWelcomeMessage]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await aiChatService.sendMessage(user.id, text.trim());
      if (mountedRef.current) {
        setMessages((prev) => [...prev, response]);
      }
    } catch (error: unknown) {
      logger.error('[VoiceChat] Error sending message:', error);
      if (mountedRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleStartRecording = async () => {
    const started = await aiVoiceService.startRecording();
    if (started) {
      setIsRecording(true);
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const audioUri = await aiVoiceService.stopRecording();
      if (!audioUri || !mountedRef.current) {
        if (mountedRef.current) setIsTranscribing(false);
        return;
      }

      // Transcribe the audio
      const transcription = await aiVoiceService.transcribeAudio(audioUri);
      await aiVoiceService.cleanupAudioFile(audioUri);

      if (!mountedRef.current) return;

      if (transcription) {
        setIsTranscribing(false);
        await handleSendMessage(transcription);
      } else {
        setIsTranscribing(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: "I couldn't understand the audio. Please try again or type your message.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error: unknown) {
      logger.error('[VoiceChat] Error with voice recording:', error);
      if (mountedRef.current) setIsTranscribing(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} />
  );

  const renderTypingIndicator = () => {
    if (!isLoading && !isTranscribing) return null;
    return (
      <View style={[styles.typingContainer, { paddingHorizontal: 12 }]}>
        <View style={[styles.typingBubble, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
          <Text style={[styles.typingText, { color: theme.colors.text.secondary }]}>
            {isTranscribing ? 'Transcribing...' : 'Thinking...'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={renderTypingIndicator}
      />

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.colors.background.card,
            borderTopColor: theme.colors.border.default,
          },
        ]}
      >
        <VoiceRecorder
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          disabled={isLoading || isTranscribing}
        />

        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.background.input,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.default,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          maxLength={2000}
          editable={!isRecording && !isTranscribing}
          onSubmitEditing={() => handleSendMessage(inputText)}
          returnKeyType="send"
        />

        <Pressable
          onPress={() => handleSendMessage(inputText)}
          disabled={!inputText.trim() || isLoading || isRecording}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: inputText.trim()
                ? theme.colors.primary.main
                : theme.colors.gray[300],
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          <SendIcon color="#FFFFFF" size={18} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  typingContainer: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  typingText: {
    fontSize: 14,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
