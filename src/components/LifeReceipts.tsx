import React, { useEffect, useState, useRef } from 'react';
import { Trash2, X, Plus, Eye, Type, Mic, Camera, Image, Loader2, MicOff } from 'lucide-react';
import { lifeReceiptsService, LifeReceipt } from '../services/lifeReceiptsService';
import { processReceiptImage, processReceiptAudio, extractReceiptFromText, ExtractedReceiptInfo } from '../services/lifeReceiptsAI';

function formatReceiptDate(createdAt: string): string {
  const receiptDate = new Date(createdAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const receiptDateOnly = new Date(receiptDate);
  receiptDateOnly.setHours(0, 0, 0, 0);

  if (receiptDateOnly.getTime() === today.getTime()) {
    return 'Today';
  } else if (receiptDateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return receiptDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: receiptDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
}

interface LifeReceiptsProps {
  onNavigateToView: () => void;
}

export function LifeReceipts({ onNavigateToView }: LifeReceiptsProps) {
  const [receipts, setReceipts] = useState<LifeReceipt[]>([]);
  const [contentInput, setContentInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedReceiptInfo | null>(null);
  const [showNoReceiptFoundModal, setShowNoReceiptFoundModal] = useState(false);

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [extractionSource, setExtractionSource] = useState<'image' | 'voice' | 'text' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const data = await lifeReceiptsService.listReceipts();
      setReceipts(data);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = contentInput.trim();
    if (!trimmedContent) {
      return;
    }

    setExtractionSource('text');
    setIsProcessing(true);
    setShowTextModal(false);

    try {
      const receiptData = await extractReceiptFromText(trimmedContent);

      if (receiptData) {
        setExtractedInfo(receiptData);
      } else {
        const newReceipt = await lifeReceiptsService.createReceipt(trimmedContent);
        setReceipts((prev) => [newReceipt, ...prev]);
        setContentInput('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error processing text:', error);
      try {
        const newReceipt = await lifeReceiptsService.createReceipt(trimmedContent);
        setReceipts((prev) => [newReceipt, ...prev]);
        setContentInput('');
        setShowAddModal(false);
      } catch (fallbackError) {
        console.error('Error creating receipt:', fallbackError);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await lifeReceiptsService.clearAllReceipts();
      setReceipts([]);
      setShowClearModal(false);
    } catch (error) {
      console.error('Error clearing receipts:', error);
    } finally {
      setClearing(false);
    }
  };

  const handleAddClick = () => {
    setShowAddModal(true);
  };

  const handleTextOption = () => {
    setShowAddModal(false);
    setShowTextModal(true);
  };

  const handleBackFromText = () => {
    setShowTextModal(false);
    setShowAddModal(true);
    setContentInput('');
  };

  const handleVoiceOption = () => {
    setShowAddModal(false);
    setShowVoiceModal(true);
    setRecordingTime(0);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceRecording(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (!mediaRecorderRef.current) return;

    const state = mediaRecorderRef.current.state;
    if (state === 'recording' || state === 'paused') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const processVoiceRecording = async (audioBlob: Blob) => {
    setExtractionSource('voice');
    setIsProcessing(true);
    setShowVoiceModal(false);

    try {
      const receiptData = await processReceiptAudio(audioBlob);

      if (receiptData) {
        setExtractedInfo(receiptData);
      } else {
        setShowNoReceiptFoundModal(true);
      }
    } catch (error) {
      console.error('Error processing voice recording:', error);
      alert('Failed to process recording. Please try again.');
    } finally {
      setIsProcessing(false);
      setRecordingTime(0);
    }
  };

  const closeVoiceModal = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
    }
    setShowVoiceModal(false);
    setRecordingTime(0);
  };

  const handleTakePhotoOption = () => {
    setShowAddModal(false);
    startCamera();
  };

  const handleUploadPhotoOption = () => {
    setShowAddModal(false);
    fileInputRef.current?.click();
  };

  const processImage = async (file: File) => {
    setExtractionSource('image');
    setIsProcessing(true);

    try {
      const receiptData = await processReceiptImage(file);

      if (receiptData) {
        setExtractedInfo(receiptData);
      } else {
        setShowNoReceiptFoundModal(true);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  const startCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setCameraStream(stream);
      setShowCameraView(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => {
          console.log('Video play error (can be ignored):', err);
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions or use the gallery option.');
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: newFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setCameraStream(stream);

      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => {
          console.log('Video play error (can be ignored):', err);
        });
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      alert('Unable to switch camera.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        setShowCameraView(false);

        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        await processImage(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraView(false);
  };

  const addReceiptFromImage = async () => {
    if (!extractedInfo) return;

    setSubmitting(true);
    try {
      const content = extractedInfo.content || 'Unknown';
      const newReceipt = await lifeReceiptsService.createReceipt(
        content,
        extractedInfo.where || 'unknown',
        extractedInfo.who || 'unknown',
        extractedInfo.when || 'someday',
        extractedInfo.obligation || 'unknown'
      );
      setReceipts((prev) => [newReceipt, ...prev]);
      setExtractedInfo(null);
    } catch (error) {
      console.error('Error creating receipt from image:', error);
      alert('Failed to create receipt. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeeClick = () => {
    onNavigateToView();
  };

  const isFormValid = contentInput.trim().length > 0;

  return (
    <>
      <div className="min-h-screen flex flex-col overflow-y-auto pb-20 sm:pb-24 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="bg-white dark:bg-gray-800 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Life Receipts
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Clear your mind, one thought at a time
            </p>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md">
            <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <button
              onClick={handleAddClick}
              className="h-40 sm:h-44 p-3 sm:p-4 rounded-xl bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center transition-all duration-200 ease-in-out hover:bg-blue-100 dark:hover:bg-gray-700 hover:shadow-md hover:border-opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              <div className="bg-blue-100 dark:bg-blue-900 p-2 sm:p-3 rounded-xl mb-2 sm:mb-3">
                <Plus className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">Add</span>
            </button>
            <button
              onClick={handleSeeClick}
              className="h-40 sm:h-44 p-3 sm:p-4 rounded-xl bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center transition-all duration-200 ease-in-out hover:bg-green-100 dark:hover:bg-gray-700 hover:shadow-md hover:border-opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              <div className="bg-green-100 dark:bg-green-900 p-2 sm:p-3 rounded-xl mb-2 sm:mb-3">
                <Eye className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">See</span>
            </button>
          </div>
          <button
            onClick={() => setShowClearModal(true)}
            disabled={receipts.length === 0}
            className="w-full h-40 sm:h-44 p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center transition-all duration-200 ease-in-out hover:bg-red-100 dark:hover:bg-gray-700 hover:shadow-md hover:border-opacity-80 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            <div className="bg-red-100 dark:bg-red-900 p-2 sm:p-3 rounded-xl mb-2 sm:mb-3">
              <Trash2 className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 text-red-600 dark:text-red-400" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">Clear my mind</span>
          </button>
          </div>
        </div>

        <main className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-4">
        </main>
      </div>

      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !clearing && setShowClearModal(false)}
          />

          <div className="relative bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowClearModal(false)}
              disabled={clearing}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-300" />
              </div>

              <h2
                id="clear-modal-title"
                className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3"
              >
                Clear your mind?
              </h2>

              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mb-6 leading-relaxed">
                This will delete all {receipts.length} receipt{receipts.length === 1 ? '' : 's'}.
                This action cannot be undone.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowClearModal(false)}
                  disabled={clearing}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {clearing ? 'Clearing...' : 'Yes, clear all'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="add-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Life Receipt</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleTextOption}
                className="h-32 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-blue-700 transition flex flex-col items-center justify-center gap-2 shadow-lg"
              >
                <Type className="w-8 h-8" aria-hidden="true" />
                <span className="text-sm">Text</span>
              </button>

              <button
                onClick={handleVoiceOption}
                className="h-32 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl font-medium hover:from-green-600 hover:to-green-700 transition flex flex-col items-center justify-center gap-2 shadow-lg"
              >
                <Mic className="w-8 h-8" aria-hidden="true" />
                <span className="text-sm">Voice</span>
              </button>

              <button
                onClick={handleTakePhotoOption}
                className="h-32 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl font-medium hover:from-rose-600 hover:to-rose-700 transition flex flex-col items-center justify-center gap-2 shadow-lg"
              >
                <Camera className="w-8 h-8" aria-hidden="true" />
                <span className="text-sm">Take a photo</span>
              </button>

              <button
                onClick={handleUploadPhotoOption}
                className="h-32 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl font-medium hover:from-amber-600 hover:to-amber-700 transition flex flex-col items-center justify-center gap-2 shadow-lg"
              >
                <Image className="w-8 h-8" aria-hidden="true" />
                <span className="text-sm">Upload a photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showTextModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="text-modal-title">
            <div className="flex items-center justify-between mb-6">
              <h3 id="text-modal-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add a thought</h3>
              <button
                onClick={() => setShowTextModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                autoFocus
              />

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Receipt'}
                </button>

                <button
                  type="button"
                  onClick={handleBackFromText}
                  disabled={submitting}
                  className="w-full px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="voice-modal-title">
            <div className="flex items-center justify-between mb-6">
              <h3 id="voice-modal-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isRecording ? 'Recording...' : 'Voice Note'}
              </h3>
              <button
                onClick={closeVoiceModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-8">
              {!isRecording ? (
                <>
                  <button
                    onClick={startVoiceRecording}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all shadow-2xl hover:shadow-green-500/50 flex items-center justify-center group"
                    aria-label="Start recording"
                  >
                    <Mic className="w-16 h-16 text-white group-hover:scale-110 transition-transform" />
                  </button>
                  <p className="text-gray-600 dark:text-gray-400 mt-6 text-center">
                    Tap the microphone to start recording
                  </p>
                </>
              ) : (
                <>
                  <div className="relative">
                    <button
                      onClick={stopVoiceRecording}
                      className="w-32 h-32 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-2xl hover:shadow-red-500/50 flex items-center justify-center animate-pulse relative z-10"
                      aria-label="Stop recording"
                    >
                      <MicOff className="w-16 h-16 text-white" />
                    </button>
                    <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75 pointer-events-none"></div>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Tap to stop recording
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {showCameraView && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col" role="dialog" aria-modal="true" aria-labelledby="camera-view-title">
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
            <h2 id="camera-view-title" className="sr-only">Camera View</h2>
            <div className="flex items-center justify-between">
              <button
                onClick={closeCamera}
                className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition"
                aria-label="Close camera"
              >
                <X className="w-6 h-6 text-white" aria-hidden="true" />
              </button>
              <button
                onClick={switchCamera}
                className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition"
                aria-label="Switch camera"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="flex-1 w-full h-full object-cover"
          />

          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute bottom-0 left-0 right-0 z-10 p-8 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center justify-center">
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white border-4 border-white/30 hover:scale-110 transition-transform shadow-lg"
                aria-label="Capture photo"
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-800" aria-hidden="true" />
                </div>
              </button>
            </div>
            <p className="text-white text-center mt-4 text-sm">
              Tap to capture • {facingMode === 'user' ? 'Front' : 'Back'} Camera
            </p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center border border-gray-200 dark:border-gray-700 shadow-2xl">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {extractionSource === 'voice' ? 'Processing Recording' : extractionSource === 'text' ? 'Processing Text' : 'Processing Image'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {extractionSource === 'voice'
                ? 'Transcribing and analyzing your recording...'
                : extractionSource === 'text'
                ? 'Analyzing your text with AI...'
                : 'Analyzing your image with AI...'}
            </p>
          </div>
        </div>
      )}

      {extractedInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full my-8 border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="extracted-modal-title">
            <div className="flex items-center justify-between mb-6">
              <h3 id="extracted-modal-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Receipt Extracted
              </h3>
              <button
                onClick={() => setExtractedInfo(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Content</h4>
                <p className="text-gray-700 dark:text-gray-300">{extractedInfo.content || 'No content found'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">Where</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{extractedInfo.where || 'unknown'}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">Who</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{extractedInfo.who || 'unknown'}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">When</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{extractedInfo.when || 'someday'}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">Action</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{extractedInfo.obligation || 'unknown'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={addReceiptFromImage}
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
                <span>{submitting ? 'Adding...' : 'Add Receipt'}</span>
              </button>

              <button
                onClick={() => {
                  setExtractedInfo(null);
                  if (extractionSource === 'voice') {
                    setShowVoiceModal(true);
                  } else if (extractionSource === 'text') {
                    setShowTextModal(true);
                  } else {
                    setShowAddModal(true);
                  }
                }}
                disabled={submitting}
                className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {extractionSource === 'voice' ? 'Record Another' : extractionSource === 'text' ? 'Edit Text' : 'Try Another Image'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoReceiptFoundModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="no-receipt-modal-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="no-receipt-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
                No Receipt Found
              </h3>
              <button
                onClick={() => setShowNoReceiptFoundModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't find any receipt information in the image. Please try with a different image or add the receipt manually.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowNoReceiptFoundModal(false);
                  setShowAddModal(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                Try Another Image
              </button>

              <button
                onClick={() => setShowNoReceiptFoundModal(false)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
