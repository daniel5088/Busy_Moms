import React, { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { CaptureFlow } from '../../src/components/life-receipts/CaptureFlow';
import { TriageFlow } from '../../src/components/life-receipts/TriageFlow';
import { ExtractedReceiptInfo } from '../../src/services/lifeReceiptsAIService';
import { lifeReceiptsService } from '../../src/services/lifeReceiptsService';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type FlowStep = 'capture' | 'triage';

export default function CaptureScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<FlowStep>('capture');
  const [extractedInfo, setExtractedInfo] = useState<ExtractedReceiptInfo | null>(null);

  const createMutation = useMutation({
    mutationFn: (info: ExtractedReceiptInfo) =>
      lifeReceiptsService.createReceipt(
        info.content,
        info.where,
        info.who,
        info.when,
        info.obligation
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['life-receipts'] });
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
      console.error('Error saving receipt:', error);
    },
  });

  const handleExtracted = (info: ExtractedReceiptInfo) => {
    setExtractedInfo(info);
    setStep('triage');
  };

  const handleConfirm = (finalInfo: ExtractedReceiptInfo) => {
    createMutation.mutate(finalInfo);
  };

  const handleCancel = () => {
    if (step === 'triage') {
      setStep('capture');
      setExtractedInfo(null);
    } else {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: step === 'capture' ? 'Capture Receipt' : 'Review Receipt',
          presentation: 'modal',
        }}
      />
      <Screen>
        {step === 'capture' && <CaptureFlow onExtracted={handleExtracted} onCancel={handleCancel} />}
        {step === 'triage' && extractedInfo && (
          <TriageFlow
            extractedInfo={extractedInfo}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </Screen>
    </>
  );
}
