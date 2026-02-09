import React, { useEffect, useState } from 'react';
import { ArrowLeft, Receipt, X, Pencil, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { lifeReceiptsService, LifeReceipt } from '../services/lifeReceiptsService';
import { formatWhenBucketLabel } from '../utils/lifeReceiptsFormatters';

interface LifeReceiptsViewProps {
  onBack: () => void;
}

export function LifeReceiptsView({ onBack }: LifeReceiptsViewProps) {
  const [receipts, setReceipts] = useState<LifeReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedWhen, setEditedWhen] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!expandedId) return;

      if (e.key === 'Escape') {
        setExpandedId(null);
        return;
      }

      const currentIndex = receipts.findIndex((r) => r.id === expandedId);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setExpandedId(receipts[currentIndex - 1].id);
        setIsEditMode(false);
      } else if (e.key === 'ArrowRight' && currentIndex < receipts.length - 1) {
        setExpandedId(receipts[currentIndex + 1].id);
        setIsEditMode(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [expandedId, receipts]);

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

  const handleTileClick = (receiptId: string) => {
    setExpandedId(receiptId);
  };

  const handleCloseModal = () => {
    setExpandedId(null);
    setIsEditMode(false);
  };

  const handleEditClick = () => {
    const receipt = receipts.find((r) => r.id === expandedId);
    if (!receipt) return;

    // Validate when value, default to "someday" if invalid
    const validWhenValues = ['now', 'soon', 'someday', 'very_important'];
    const normalizedWhen = receipt.when_bucket?.toLowerCase().trim();
    const whenValue = validWhenValues.includes(normalizedWhen || '') ? normalizedWhen : 'someday';

    setEditedContent(receipt.content || '');
    setEditedWhen(whenValue || 'someday');
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!expandedId) return;

    try {
      await lifeReceiptsService.updateReceipt(expandedId, {
        content: editedContent,
        when_bucket: editedWhen,
      });
      await loadReceipts();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating receipt:', error);
      alert('Failed to update mental note. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedContent('');
    setEditedWhen('');
  };

  const handleDoneClick = async () => {
    if (!expandedId) return;

    const confirmed = window.confirm('Are you sure you want to delete this mental note?');
    if (!confirmed) return;

    try {
      await lifeReceiptsService.deleteReceipt(expandedId);
      setReceipts((prev) => prev.filter((r) => r.id !== expandedId));
      setExpandedId(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete mental note. Please try again.');
    }
  };

  const handlePreviousNote = () => {
    if (!expandedId) return;
    const currentIndex = receipts.findIndex((r) => r.id === expandedId);
    if (currentIndex > 0) {
      setExpandedId(receipts[currentIndex - 1].id);
      setIsEditMode(false);
    }
  };

  const handleNextNote = () => {
    if (!expandedId) return;
    const currentIndex = receipts.findIndex((r) => r.id === expandedId);
    if (currentIndex < receipts.length - 1) {
      setExpandedId(receipts[currentIndex + 1].id);
      setIsEditMode(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-y-auto pb-20 sm:pb-24 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Your Mental Notes
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {receipts.length} {receipts.length === 1 ? 'thought' : 'thoughts'} stored
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading your mental notes...</p>
            </div>
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Receipt className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No mental notes yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add your first thought to see it here
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  onClick={() => handleTileClick(receipt.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTileClick(receipt.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View mental note: ${receipt.content}`}
                  className="aspect-square p-3 sm:p-4 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
                >
                  <div className="flex items-center justify-center h-full">
                    <p className="text-s sm:text-sm text-gray-800 dark:text-gray-200 leading-snug line-clamp-3 text-center break-words">
                      {receipt.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {expandedId && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
                onClick={handleCloseModal}
              >
                <div
                  className="flex flex-col gap-4 animate-scaleIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-2xl w-[min(92vw,280px)] h-[min(75vh,300px)] flex flex-col relative">
                    {(() => {
                      const currentIndex = receipts.findIndex((r) => r.id === expandedId);
                      const hasPrevious = currentIndex > 0;
                      const hasNext = currentIndex < receipts.length - 1;

                      return (
                        <>
                          {hasPrevious && (
                            <button
                              onClick={handlePreviousNote}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 border-2 border-gray-300 dark:border-gray-600 shadow-lg hover:bg-white dark:hover:bg-gray-700 hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 z-10 flex items-center justify-center"
                              aria-label="Previous note"
                            >
                              <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </button>
                          )}

                          {hasNext && (
                            <button
                              onClick={handleNextNote}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 border-2 border-gray-300 dark:border-gray-600 shadow-lg hover:bg-white dark:hover:bg-gray-700 hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 z-10 flex items-center justify-center"
                              aria-label="Next note"
                            >
                              <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </button>
                          )}
                        </>
                      );
                    })()}

                    <div className="h-12 flex items-center justify-end px-4 flex-shrink-0">
                      <button
                        onClick={handleCloseModal}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
                        aria-label="Close modal"
                      >
                        <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      </button>
                    </div>

                    {(() => {
                      const receipt = receipts.find((r) => r.id === expandedId);
                      if (!receipt) return null;

                      if (isEditMode) {
                        return (
                          <>
                            <div className="flex-1 overflow-y-auto px-6 pb-3">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                Edit Note
                              </h3>

                              <div className="mb-3">
                                <label className="block text-xs font-semibold tracking-wide uppercase opacity-70 mb-1.5">
                                  Content
                                </label>
                                <textarea
                                  value={editedContent}
                                  onChange={(e) => setEditedContent(e.target.value)}
                                  className="w-full rounded-lg bg-white/80 dark:bg-white/90 px-3 py-2 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                  rows={6}
                                />
                              </div>
                            </div>

                            <div className="flex-shrink-0 px-6 pb-4">
                              <label className="block text-xs font-semibold tracking-wide uppercase opacity-70 mb-1.5">
                                When
                              </label>
                              <select
                                value={editedWhen}
                                onChange={(e) => setEditedWhen(e.target.value)}
                                className="w-full rounded-lg bg-white/80 dark:bg-white/90 px-3 py-2 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                              >
                                <option value="now">Now</option>
                                <option value="soon">Soon</option>
                                <option value="someday">Someday</option>
                                <option value="very_important">Very Important</option>
                              </select>
                            </div>
                          </>
                        );
                      }

                      return (
                        <>
                          <div className="flex-1 overflow-y-auto px-6 pb-3 flex items-center justify-center">
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-relaxed text-center break-words">
                              {receipt.content}
                            </p>
                          </div>

                          <div className="flex-shrink-0 px-6 pb-4">
                            <div className="text-xs font-semibold tracking-wide uppercase opacity-70 mb-1.5 text-center">
                              When
                            </div>
                            <div className="rounded-lg bg-white/80 px-3 py-2 text-center text-sm break-words">
                              {formatWhenBucketLabel(receipt.when_bucket)}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex justify-center gap-3">
                    {isEditMode ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="px-6 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 shadow-sm hover:bg-green-100 dark:hover:bg-green-900/50 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600"
                        >
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-700 dark:text-green-400" />
                            <span className="font-semibold text-green-700 dark:text-green-400 text-sm">
                              Save
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-6 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                        >
                          <div className="flex items-center gap-2">
                            <X className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                              Cancel
                            </span>
                          </div>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleEditClick}
                          className="px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="bg-blue-100 dark:bg-blue-800 p-1.5 rounded-lg">
                              <Pencil className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                            </div>
                            <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs">
                              Edit
                            </span>
                          </div>
                        </button>

                        <button
                          onClick={handleDoneClick}
                          className="px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 shadow-sm hover:bg-green-100 dark:hover:bg-green-900/50 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="bg-green-100 dark:bg-green-800 p-1.5 rounded-lg">
                              <Check className="w-4 h-4 text-green-700 dark:text-green-300" />
                            </div>
                            <span className="font-semibold text-green-700 dark:text-green-300 text-xs">
                              Done
                            </span>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
