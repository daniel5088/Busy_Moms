import { useState, useEffect } from 'react';
import {
  getTutorialProgress,
  markTutorialComplete,
  TutorialName,
} from '../services/tutorialService';
import { TutorialStep } from '../utils/tutorialSteps';

export function useTutorial(tutorialName: TutorialName, steps: TutorialStep[]) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkTutorialStatus();
  }, [tutorialName]);

  const checkTutorialStatus = async () => {
    try {
      const completed = await getTutorialProgress(tutorialName);
      if (!completed) {
        // Show tutorial on first visit
        setIsActive(true);
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      complete();
    }
  };

  const back = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skip = () => {
    complete();
  };

  const complete = async () => {
    setIsActive(false);
    try {
      await markTutorialComplete(tutorialName);
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  return {
    isActive,
    isLoading,
    currentStep,
    totalSteps: steps.length,
    step: steps[currentStep],
    next,
    back,
    skip,
    restart,
  };
}
