import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, AlertCircle, CheckCircle, Loader, Edit } from 'lucide-react';
import { processBusinessCard, isImageFile, validateImageSize } from '../services/businessCardService';
import { parseAndValidateContact, ParsedContactData, ValidatedContactData } from '../utils/contactDataParser';

interface BusinessCardScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onContactExtracted: (contact: ValidatedContactData) => void;
}

export function BusinessCardScanner({ isOpen, onClose, onContactExtracted }: BusinessCardScannerProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ParsedContactData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<ParsedContactData | null>(null);
  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetState = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setProcessing(false);
    setError(null);
    setExtractedData(null);
    setIsEditing(false);
    setEditableData(null);
  };

  const handleClose = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraView(false);
    resetState();
    onClose();
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleImageSelect = (file: File) => {
    setError(null);

    if (!isImageFile(file)) {
      setError('Please select a valid image file (JPEG, PNG, or HEIC)');
      return;
    }

    if (!validateImageSize(file, 10)) {
      setError('Image size must be less than 10MB');
      return;
    }

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        setShowCameraView(false);

        const file = new File([blob], 'business-card.jpg', { type: 'image/jpeg' });
        handleImageSelect(file);
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

  const handleProcessImage = async () => {
    if (!selectedImage) return;

    setProcessing(true);
    setError(null);

    try {
      const result = await processBusinessCard(selectedImage);

      if (result.error) {
        setError(result.error);
        setProcessing(false);
        return;
      }

      if (!result.contact) {
        setError('No contact information detected on this business card. Please try a clearer image or enter manually.');
        setProcessing(false);
        return;
      }

      setExtractedData(result.contact);
      setEditableData(result.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setExtractedData(editableData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditableData(extractedData);
    setIsEditing(false);
  };

  const handleUseContact = () => {
    if (!extractedData) return;

    const validated = parseAndValidateContact(extractedData);

    if (!validated.isValid) {
      setError(validated.warnings.join('. '));
      return;
    }

    onContactExtracted(validated);
    handleClose();
  };

  if (!isOpen) return null;

  if (showCameraView) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={closeCamera}
              className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition"
              aria-label="Close camera"
            >
              <X className="w-6 h-6 text-white" />
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

        <div className="flex-1 relative bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 p-8 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex flex-col items-center">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white border-4 border-white/30 hover:scale-110 transition-transform shadow-lg"
              aria-label="Capture photo"
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-800" />
              </div>
            </button>
          </div>
          <p className="text-white text-center mt-4 text-sm">
            Tap to capture • {facingMode === 'user' ? 'Front' : 'Back'} Camera
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Business Card</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Capture or upload a photo of a business card</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {!imagePreview && !extractedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startCamera}
                  className="h-32 bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800 text-white rounded-2xl font-medium hover:from-gray-700 hover:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 transition flex flex-col items-center justify-center gap-2 shadow-lg"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">Camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800 text-white rounded-2xl font-medium hover:from-gray-700 hover:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 transition flex flex-col items-center justify-center gap-2 shadow-lg"
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">Gallery</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
                onChange={handleFileInput}
                className="hidden"
              />

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Tips for best results:</h3>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Ensure good lighting and avoid shadows</li>
                  <li>• Keep the card flat and in focus</li>
                  <li>• Capture the entire card within the frame</li>
                  <li>• Avoid glare on glossy cards</li>
                </ul>
              </div>
            </div>
          )}

          {imagePreview && !extractedData && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Business card preview"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                />
                {processing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader className="w-12 h-12 animate-spin mx-auto mb-2" />
                      <p className="text-sm font-medium">Processing card...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={resetState}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Choose Different Image
                </button>
                <button
                  onClick={handleProcessImage}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {processing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Scan Card</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {extractedData && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                    Contact Information Extracted
                  </h3>
                  <p className="text-xs text-green-700 dark:text-green-200">
                    Review the information below before saving
                  </p>
                </div>
                {!isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors"
                    title="Edit information"
                  >
                    <Edit className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase block mb-1">Name</label>
                    <input
                      type="text"
                      value={editableData?.name || ''}
                      onChange={(e) => setEditableData(editableData ? { ...editableData, name: e.target.value } : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase block mb-1">Job Title</label>
                    <input
                      type="text"
                      value={editableData?.jobTitle || ''}
                      onChange={(e) => setEditableData(editableData ? { ...editableData, jobTitle: e.target.value } : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase block mb-1">Company</label>
                    <input
                      type="text"
                      value={editableData?.company || ''}
                      onChange={(e) => setEditableData(editableData ? { ...editableData, company: e.target.value } : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase block mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editableData?.phone || ''}
                      onChange={(e) => setEditableData(editableData ? { ...editableData, phone: e.target.value } : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase block mb-1">Email</label>
                    <input
                      type="email"
                      value={editableData?.email || ''}
                      onChange={(e) => setEditableData(editableData ? { ...editableData, email: e.target.value } : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase block mb-1">Address</label>
                    <input
                      type="text"
                      value={editableData?.address || ''}
                      onChange={(e) => setEditableData(editableData ? { ...editableData, address: e.target.value } : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase block mb-1">Website</label>
                    <input
                      type="url"
                      value={editableData?.website || ''}
                      onChange={(e) => setEditableData(editableData ? { ...editableData, website: e.target.value } : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Name</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{extractedData.name || 'Not detected'}</p>
                  </div>

                  {extractedData.jobTitle && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Job Title</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{extractedData.jobTitle}</p>
                    </div>
                  )}

                  {extractedData.company && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Company</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{extractedData.company}</p>
                    </div>
                  )}

                  {extractedData.phone && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Phone</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{extractedData.phone}</p>
                    </div>
                  )}

                  {extractedData.email && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Email</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{extractedData.email}</p>
                    </div>
                  )}

                  {extractedData.address && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Address</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{extractedData.address}</p>
                    </div>
                  )}

                  {extractedData.website && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Website</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{extractedData.website}</p>
                    </div>
                  )}
                </div>
              )}

              {!isEditing && (
                <div className="flex space-x-3">
                  <button
                    onClick={resetState}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Scan Another
                  </button>
                  <button
                    onClick={handleUseContact}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Use This Contact</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Error</h3>
                <p className="text-xs text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}