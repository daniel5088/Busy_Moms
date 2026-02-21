import React, { useState, useRef } from 'react';
import { Camera, Upload, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setProcessing(false);
    setError(null);
    setExtractedData(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setProcessing(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Scan Business Card</h2>
            <p className="text-sm text-gray-600">Capture or upload a photo of a business card</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {!imagePreview && !extractedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Camera className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-sm font-medium text-gray-700">Take Photo</span>
                  <span className="text-xs text-gray-500 mt-1">Use camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-sm font-medium text-gray-700">Upload Photo</span>
                  <span className="text-xs text-gray-500 mt-1">From gallery</span>
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
                onChange={handleFileInput}
                className="hidden"
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for best results:</h3>
                <ul className="text-xs text-blue-800 space-y-1">
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
                  className="w-full rounded-lg border border-gray-200"
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
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-900 mb-1">
                    Contact Information Extracted
                  </h3>
                  <p className="text-xs text-green-700">
                    Confidence: {extractedData.confidence}% - Review the information below before saving
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Name</label>
                  <p className="text-sm text-gray-900 font-medium">{extractedData.name || 'Not detected'}</p>
                </div>

                {extractedData.jobTitle && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Job Title</label>
                    <p className="text-sm text-gray-900">{extractedData.jobTitle}</p>
                  </div>
                )}

                {extractedData.company && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Company</label>
                    <p className="text-sm text-gray-900">{extractedData.company}</p>
                  </div>
                )}

                {extractedData.phone && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Phone</label>
                    <p className="text-sm text-gray-900">{extractedData.phone}</p>
                  </div>
                )}

                {extractedData.email && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Email</label>
                    <p className="text-sm text-gray-900">{extractedData.email}</p>
                  </div>
                )}

                {extractedData.address && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Address</label>
                    <p className="text-sm text-gray-900">{extractedData.address}</p>
                  </div>
                )}

                {extractedData.website && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Website</label>
                    <p className="text-sm text-gray-900">{extractedData.website}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={resetState}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
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
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
