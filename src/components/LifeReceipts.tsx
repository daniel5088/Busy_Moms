import React, { useEffect, useState, useRef } from 'react';
import { Trash2, X, Plus, Eye, Type, Mic, Camera, Image } from 'lucide-react';
import { lifeReceiptsService, LifeReceipt } from '../services/lifeReceiptsService';

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
  const [showAddForm, setShowAddForm] = useState(false);

  const addFormRef = useRef<HTMLDivElement>(null);

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

    setSubmitting(true);
    try {
      const newReceipt = await lifeReceiptsService.createReceipt(trimmedContent);
      setReceipts((prev) => [newReceipt, ...prev]);
      setContentInput('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating receipt:', error);
    } finally {
      setSubmitting(false);
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
    setShowAddForm(true);
    setTimeout(() => {
      addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleVoiceOption = () => {
    setShowAddModal(false);
    console.log('Voice input - Coming soon');
  };

  const handleTakePhotoOption = () => {
    setShowAddModal(false);
    console.log('Take photo - Coming soon');
  };

  const handleUploadPhotoOption = () => {
    setShowAddModal(false);
    console.log('Upload photo - Coming soon');
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
          {showAddForm && (
            <div ref={addFormRef} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Add a thought
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-2">
                <div>
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    What's on your mind?
                  </label>
                  <textarea
                    id="content"
                    value={contentInput}
                    onChange={(e) => setContentInput(e.target.value)}
                    placeholder="e.g., Pick up kids at 3pm, Call dentist tomorrow, Buy birthday gift for Sarah..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base resize-none"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {submitting ? 'Adding...' : 'Add Receipt'}
                </button>
              </form>
            </div>
          )}
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
    </>
  );
}
