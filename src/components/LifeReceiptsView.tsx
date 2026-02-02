import React, { useEffect, useState } from 'react';
import { ArrowLeft, Receipt } from 'lucide-react';
import { lifeReceiptsService, LifeReceipt } from '../services/lifeReceiptsService';

interface LifeReceiptsViewProps {
  onBack: () => void;
}

export function LifeReceiptsView({ onBack }: LifeReceiptsViewProps) {
  const [receipts, setReceipts] = useState<LifeReceipt[]>([]);
  const [loading, setLoading] = useState(true);

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
          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="aspect-square bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-md hover:shadow-lg transition-shadow p-3 sm:p-4 flex items-center justify-center"
              >
                <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-snug line-clamp-3 text-center break-words">
                  {receipt.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
