import React, { useEffect, useState } from 'react';
import { ArrowLeft, Receipt, X } from 'lucide-react';
import { lifeReceiptsService, LifeReceipt } from '../services/lifeReceiptsService';

interface LifeReceiptsViewProps {
  onBack: () => void;
}

export function LifeReceiptsView({ onBack }: LifeReceiptsViewProps) {
  const [receipts, setReceipts] = useState<LifeReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                  className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-2xl w-full max-w-lg p-6 animate-scaleIn relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleCloseModal}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>

                  {(() => {
                    const receipt = receipts.find((r) => r.id === expandedId);
                    if (!receipt) return null;

                    return (
                      <div className="flex flex-col">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 leading-tight pr-8">
                          {receipt.content}
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              What
                            </label>
                            <div className="bg-white dark:bg-gray-700 rounded-md px-3 py-2 border border-gray-200 dark:border-gray-600">
                              <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                                {receipt.what || 'unknown'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Who
                            </label>
                            <div className="bg-white dark:bg-gray-700 rounded-md px-3 py-2 border border-gray-200 dark:border-gray-600">
                              <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                                {receipt.who || 'unknown'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Action
                            </label>
                            <div className="bg-white dark:bg-gray-700 rounded-md px-3 py-2 border border-gray-200 dark:border-gray-600">
                              <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                                {receipt.obligation || 'unknown'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              When
                            </label>
                            <div className="bg-white dark:bg-gray-700 rounded-md px-3 py-2 border border-gray-200 dark:border-gray-600">
                              <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                                {receipt.when_bucket || 'unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
