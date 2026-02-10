import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { Type, Mic, Camera as CameraIcon, Loader2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import {
  extractReceiptFromText,
  processReceiptAudio,
  processReceiptImage,
  ExtractedReceiptInfo,
} from '../../services/lifeReceiptsAIService';

export type CaptureMode = 'select' | 'text' | 'voice' | 'camera';

interface CaptureFlowProps {
  onExtracted: (info: ExtractedReceiptInfo) => void;
  onCancel: () => void;
}

export function CaptureFlow({ onExtracted, onCancel }: CaptureFlowProps) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<CaptureMode>('select');
  const [textInput, setTextInput] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleTextCapture = async () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    setProcessing(true);
    try {
      const result = await extractReceiptFromText(textInput);
      if (result) {
        onExtracted(result);
      } else {
        // If AI extraction fails, create basic receipt with just content
        onExtracted({
          content: textInput,
          where: 'unknown',
          who: 'unknown',
          when: 'someday',
          obligation: 'unknown',
        });
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      Alert.alert('Error', 'Failed to process text. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleVoiceCapture = async () => {
    Alert.alert(
      'Voice Recording',
      'Voice recording requires expo-av and recording permissions. This feature will be fully implemented when audio recording is integrated.',
      [{ text: 'OK', onPress: onCancel }]
    );
  };

  const handleCameraCapture = async () => {
    Alert.alert(
      'Camera',
      'Camera capture requires expo-camera and camera permissions. This feature will be fully implemented when camera is integrated.',
      [{ text: 'OK', onPress: onCancel }]
    );
  };

  if (mode === 'select') {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          How would you like to capture?
        </Text>

        <Pressable
          onPress={() => setMode('text')}
          style={({ pressed }) => [
            styles.option,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.default,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Type
              size={24}
              color={theme.colors.primary.main}
              // @ts-ignore
              strokeWidth={2}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: theme.colors.text.primary }]}>
              Text
            </Text>
            <Text style={[styles.optionDescription, { color: theme.colors.text.secondary }]}>
              Type or paste your note
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={handleVoiceCapture}
          style={({ pressed }) => [
            styles.option,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.default,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Mic
              size={24}
              color={theme.colors.secondary.main}
              // @ts-ignore
              strokeWidth={2}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: theme.colors.text.primary }]}>
              Voice
            </Text>
            <Text style={[styles.optionDescription, { color: theme.colors.text.secondary }]}>
              Record a voice memo
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={handleCameraCapture}
          style={({ pressed }) => [
            styles.option,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.default,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <CameraIcon
              size={24}
              color={theme.colors.status.success}
              // @ts-ignore
              strokeWidth={2}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: theme.colors.text.primary }]}>
              Camera
            </Text>
            <Text style={[styles.optionDescription, { color: theme.colors.text.secondary }]}>
              Take a photo of a note or receipt
            </Text>
          </View>
        </Pressable>

        <Button title="Cancel" variant="secondary" onPress={onCancel} style={styles.cancelButton} />
      </View>
    );
  }

  if (mode === 'text') {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Enter Text</Text>

        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.default,
              color: theme.colors.text.primary,
            },
          ]}
          placeholder="What do you want to remember?"
          placeholderTextColor={theme.colors.text.tertiary}
          value={textInput}
          onChangeText={setTextInput}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          autoFocus
        />

        <View style={styles.buttonRow}>
          <Button
            title="Back"
            variant="secondary"
            onPress={() => {
              setMode('select');
              setTextInput('');
            }}
            style={styles.buttonHalf}
            disabled={processing}
          />
          <Button
            title={processing ? 'Processing...' : 'Continue'}
            onPress={handleTextCapture}
            style={styles.buttonHalf}
            disabled={processing || !textInput.trim()}
            loading={processing}
          />
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 120,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
  },
  cancelButton: {
    marginTop: 12,
  },
});
