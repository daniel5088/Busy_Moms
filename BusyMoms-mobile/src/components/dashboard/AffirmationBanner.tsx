import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
// @ts-ignore
import { SparklesIcon as Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

interface AffirmationBannerProps {
  affirmation?: string | null;
  onPress?: () => void;
}

const DEFAULT_AFFIRMATION = "You're doing amazing! Keep being the wonderful person you are.";

export function AffirmationBanner({ affirmation, onPress }: AffirmationBannerProps) {
  const { theme } = useTheme();

  const displayText = affirmation || DEFAULT_AFFIRMATION;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.primary.main, theme.colors.primary.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          {/* @ts-ignore */}
          <Sparkles color="#ffffff" size={24} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Today's Affirmation</Text>
          <Text style={styles.affirmationText} numberOfLines={2}>
            {displayText}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  gradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  affirmationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    lineHeight: 22,
  },
});
