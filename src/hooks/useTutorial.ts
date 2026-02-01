import { useState, useEffect, useCallback } from 'react';
import { TutorialStep } from '../components/TutorialOverlay';
import { TutorialName, getTutorialProgress, markTutorialComplete } from '../services/tutorialService';

export function useTutorial(tutorialName: TutorialName, steps: TutorialStep[]) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const completed = await getTutorialProgress(tutorialName);
        setVisible(!completed);
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkTutorialStatus();
  }, [tutorialName]);

  const handleNext = useCallback(async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await markTutorialComplete(tutorialName);
      setVisible(false);
      setCurrentStep(0);
    }
  }, [currentStep, steps.length, tutorialName]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(async () => {
    await markTutorialComplete(tutorialName);
    setVisible(false);
    setCurrentStep(0);
  }, [tutorialName]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setVisible(true);
  }, []);

  return {
    visible,
    currentStep,
    loading,
    handleNext,
    handleBack,
    handleSkip,
    startTutorial,
  };
}
