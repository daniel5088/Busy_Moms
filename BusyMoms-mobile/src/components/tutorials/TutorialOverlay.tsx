import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import { TutorialStep } from '../../utils/tutorialSteps';

interface TutorialOverlayProps {
  isVisible: boolean;
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const { height } = Dimensions.get('window');

export function TutorialOverlay({
  isVisible,
  step,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: TutorialOverlayProps) {
  const { theme } = useTheme();

  const getContentPosition = () => {
    switch (step.placement) {
      case 'top':
        return { top: height * 0.15 };
      case 'bottom':
        return { bottom: height * 0.15 };
      case 'center':
      default:
        return { top: height * 0.35 };
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <X
            size={24}
            color="#fff"
            // @ts-ignore
            strokeWidth={2}
          />
        </Pressable>

        <View style={[styles.contentContainer, getContentPosition()]}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.background.primary, borderColor: theme.colors.border.default },
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>{step.title}</Text>
            <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
              {step.description}
            </Text>

            <View style={styles.progressDots}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === currentStep
                          ? theme.colors.primary.main
                          : theme.colors.border.default,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttonRow}>
              {currentStep > 0 && (
                <Button title="Back" variant="secondary" onPress={onBack} style={styles.buttonHalf} />
              )}
              <Button
                title={currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
                onPress={onNext}
                style={currentStep === 0 ? styles.buttonFull : styles.buttonHalf}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  contentContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonFull: {
    flex: 1,
  },
});
