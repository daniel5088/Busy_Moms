import React, { useEffect, useState } from 'react';
import { ArrowLeft, Receipt, X, Pencil, Sparkles, Check } from 'lucide-react';
import { lifeReceiptsService, LifeReceipt } from '../services/lifeReceiptsService';

interface LifeReceiptsViewProps {
  onBack: () => void;
}

export function LifeReceiptsView({ onBack }: LifeReceiptsViewProps) {
  const [receipts, setReceipts] = useState<LifeReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedWhat, setEditedWhat] = useState('');
  const [editedWho, setEditedWho] = useState('');
  const [editedWhen, setEditedWhen] = useState('');
  const [editedAction, setEditedAction] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedId) {
        setExpandedId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [expandedId]);

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

    setEditedContent(receipt.content || '');
    setEditedWhat(receipt.what || '');
    setEditedWho(receipt.who || '');
    setEditedWhen(receipt.when_bucket || '');
    setEditedAction(receipt.obligation || '');
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!expandedId) return;

    try {
      await lifeReceiptsService.updateReceipt(expandedId, {
        content: editedContent,
        what: editedWhat,
        who: editedWho,
        when_bucket: editedWhen,
        obligation: editedAction,
      });
      await loadReceipts();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating receipt:', error);
      alert('Failed to update receipt. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedContent('');
    setEditedWhat('');
    setEditedWho('');
    setEditedWhen('');
    setEditedAction('');
  };

  const handleSolveClick = () => {
    // Placeholder - does nothing for now
  };

  const handleDoneClick = async () => {
    if (!expandedId) return;

    const confirmed = window.confirm('Are you sure you want to delete this receipt?');
    if (!confirmed) return;

    try {
      await lifeReceiptsService.deleteReceipt(expandedId);
      setReceipts((prev) => prev.filter((r) => r.id !== expandedId));
      setExpandedId(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt. Please try again.');
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
              Your Receipts
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
              <p className="text-gray-600 dark:text-gray-400">Loading your receipts...</p>
            </div>
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Receipt className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No receipts yet
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
                  aria-label={`View receipt: ${receipt.content}`}
                  className="aspect-square p-3 sm:p-4 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
                >
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-snug line-clamp-3 text-center break-words">
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
                  <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-2xl w-full max-w-xs p-4 relative">
                    <button
                      onClick={handleCloseModal}
                      className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>

                    {(() => {
                      const receipt = receipts.find((r) => r.id === expandedId);
                      if (!receipt) return null;

                      if (isEditMode) {
                        return (
                          <div className="flex flex-col">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                              Edit Receipt
                            </h3>

                            <div className="mb-3">
                              <label className="block text-[10px] font-semibold tracking-wide uppercase opacity-70 mb-1">
                                Content
                              </label>
                              <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full rounded-lg bg-white/80 dark:bg-white/90 px-3 py-2 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                rows={3}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-semibold tracking-wide uppercase opacity-70 mb-1">
                                  What
                                </label>
                                <input
                                  type="text"
                                  value={editedWhat}
                                  onChange={(e) => setEditedWhat(e.target.value)}
                                  className="w-full rounded-lg bg-white/80 dark:bg-white/90 px-2 py-1 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold tracking-wide uppercase opacity-70 mb-1">
                                  Who
                                </label>
                                <input
                                  type="text"
                                  value={editedWho}
                                  onChange={(e) => setEditedWho(e.target.value)}
                                  className="w-full rounded-lg bg-white/80 dark:bg-white/90 px-2 py-1 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold tracking-wide uppercase opacity-70 mb-1">
                                  When
                                </label>
                                <input
                                  type="text"
                                  value={editedWhen}
                                  onChange={(e) => setEditedWhen(e.target.value)}
                                  className="w-full rounded-lg bg-white/80 dark:bg-white/90 px-2 py-1 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold tracking-wide uppercase opacity-70 mb-1">
                                  Action
                                </label>
                                <input
                                  type="text"
                                  value={editedAction}
                                  onChange={(e) => setEditedAction(e.target.value)}
                                  className="w-full rounded-lg bg-white/80 dark:bg-white/90 px-2 py-1 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-relaxed text-center px-1 break-words">
                            {receipt.content}
                          </h3>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                                What
                              </div>
                              <div className="mt-1 rounded-lg bg-white/80 px-2 py-1 text-center text-sm">
                                {receipt.what || 'unknown'}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                                Who
                              </div>
                              <div className="mt-1 rounded-lg bg-white/80 px-2 py-1 text-center text-sm">
                                {receipt.who || 'unknown'}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                                When
                              </div>
                              <div className="mt-1 rounded-lg bg-white/80 px-2 py-1 text-center text-sm">
                                {receipt.when_bucket || 'unknown'}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                                Action
                              </div>
                              <div className="mt-1 rounded-lg bg-white/80 px-2 py-1 text-center text-sm">
                                {receipt.obligation || 'unknown'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
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
                          onClick={handleSolveClick}
                          className="px-4 py-2.5 rounded-lg bg-pink-50 dark:bg-pink-900/30 border-2 border-pink-300 dark:border-pink-700 shadow-sm hover:bg-pink-100 dark:hover:bg-pink-900/50 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:focus:ring-pink-600"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="bg-pink-100 dark:bg-pink-800 p-1.5 rounded-lg">
                              <Sparkles className="w-4 h-4 text-pink-700 dark:text-pink-300" />
                            </div>
                            <span className="font-semibold text-pink-700 dark:text-pink-300 text-xs">
                              Solve
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
