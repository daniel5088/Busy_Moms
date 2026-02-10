import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated, Text } from 'react-native';
// @ts-ignore
import { Mic as MicIcon, Square as StopIcon } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  isRecording,
  onStartRecording,
  onStopRecording,
  disabled = false,
}: VoiceRecorderProps) {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => { pulse.stop(); };
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [isRecording, pulseAnim]);

  const handlePress = () => {
    if (disabled) return;
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              backgroundColor: theme.colors.status.error + '30',
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: isRecording ? theme.colors.status.error : theme.colors.primary.main,
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}
        accessibilityLabel={isRecording ? 'Stop recording' : 'Start voice recording'}
        accessibilityHint={isRecording ? 'Tap to stop recording your voice message' : 'Tap to start recording a voice message'}
        accessibilityRole="button"
      >
        {isRecording ? (
          <StopIcon color="#FFFFFF" size={20} />
        ) : (
          <MicIcon color="#FFFFFF" size={20} />
        )}
      </Pressable>
      {isRecording && (
        <Text style={[styles.recordingText, { color: theme.colors.status.error }]}>
          Recording...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
