import React, { useEffect, useState } from 'react';
import { Receipt, Trash2, X } from 'lucide-react';
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

export function LifeReceipts() {
  const [receipts, setReceipts] = useState<LifeReceipt[]>([]);
  const [contentInput, setContentInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  const isFormValid = contentInput.trim().length > 0;

  return (
    <>
      <div className="h-screen overflow-y-auto pb-20 sm:pb-24 bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Life Receipts
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Clear your mind, one thought at a time
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {receipts.length > 0 && (
                <button
                  onClick={() => setShowClearModal(true)}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm sm:text-base flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear my mind</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              </div>
            </div>
          </div>
        </header>

        <main className="pt-2 px-3 pb-3 sm:pt-1 sm:px-4 sm:pb-4 space-y-2">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Add a thought
            </h2>
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {submitting ? 'Adding...' : 'Add Receipt'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Your Receipts
            </h2>

            {loading ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
                Loading your receipts...
              </div>
            ) : receipts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                <Receipt className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No receipts yet
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Add your first thought using the form above
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
                          {receipt.content}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                          {formatReceiptDate(receipt.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
    </>
  );
}
