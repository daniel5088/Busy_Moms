import React, { useState, useEffect } from 'react';
import { X, Check, SkipForward } from 'lucide-react';
import { lifeReceiptsService, LifeReceipt } from '../services/lifeReceiptsService';
import { formatWhenBucketLabel } from '../utils/lifeReceiptsFormatters';

interface ReceiptTriageFlowProps {
  receipts: LifeReceipt[];
  onClose: () => void;
  onReceiptDeleted: (id: string) => void;
}

const getPriorityOrder = (whenBucket: string): number => {
  const priorities: Record<string, number> = {
    very_important: 0,
    now: 1,
    soon: 2,
    someday: 3,
  };
  return priorities[whenBucket.toLowerCase()] ?? 4;
};

const getBorderStyle = (whenBucket: string): string => {
  const bucket = whenBucket.toLowerCase();
  switch (bucket) {
    case 'very_important':
      return 'border-4 border-red-500';
    case 'now':
      return 'border-4 border-orange-500';
    case 'soon':
      return 'border-2 border-orange-400';
    case 'someday':
      return 'border-2 border-yellow-400';
    default:
      return 'border-2 border-yellow-400';
  }
};

export function ReceiptTriageFlow({ receipts, onClose, onReceiptDeleted }: ReceiptTriageFlowProps) {
  const [queue, setQueue] = useState<LifeReceipt[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized && receipts.length > 0) {
      const sortedReceipts = [...receipts].sort((a, b) => {
        const priorityDiff = getPriorityOrder(a.when_bucket) - getPriorityOrder(b.when_bucket);

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        const aTime = a.created_at ? new Date(a.created_at).getTime() : null;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : null;

        if (aTime !== null && bTime !== null && !isNaN(aTime) && !isNaN(bTime)) {
          return aTime - bTime;
        }

        return a.id.localeCompare(b.id);
      });
      setQueue(sortedReceipts);
      setIsInitialized(true);
    }
  }, [receipts, isInitialized]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleDone = async () => {
    const currentReceipt = queue[0];
    if (!currentReceipt || isDeleting) return;

    setIsDeleting(true);
    try {
      await lifeReceiptsService.deleteReceipt(currentReceipt.id);
      onReceiptDeleted(currentReceipt.id);

      const newQueue = queue.slice(1);
      setQueue(newQueue);

      if (newQueue.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete mental note. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSkip = () => {
    if (queue.length === 0) return;

    const newQueue = queue.slice(1);
    setQueue(newQueue);

    if (newQueue.length === 0) {
      onClose();
    }
  };

  if (queue.length === 0) {
    return null;
  }

  const currentReceipt = queue[0];
  const remainingCount = queue.length;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-4 animate-scaleIn w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-2">
          <div className="text-white font-semibold text-sm">
            {remainingCount} {remainingCount === 1 ? 'note' : 'notes'} remaining
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close triage flow"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="relative pl-8">
          {queue.length >= 4 && (
            <div
              className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-lg border border-yellow-300 dark:border-yellow-700 opacity-40 transition-all duration-300"
              style={{ transform: 'translateX(-24px) translateY(4px)' }}
            />
          )}
          {queue.length >= 3 && (
            <div
              className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-lg border border-yellow-300 dark:border-yellow-700 opacity-50 transition-all duration-300"
              style={{ transform: 'translateX(-16px) translateY(3px)' }}
            />
          )}
          {queue.length >= 2 && (
            <div
              className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-lg border border-yellow-300 dark:border-yellow-700 opacity-60 transition-all duration-300"
              style={{ transform: 'translateX(-8px) translateY(2px)' }}
            />
          )}

          <div
            className={`relative z-10 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-lg shadow-2xl w-[280px] max-w-[calc(100vw-140px)] h-[min(75vh,300px)] flex flex-col ${getBorderStyle(
              currentReceipt.when_bucket
            )} transition-all duration-300`}
          >
            <div className="flex-1 overflow-y-auto px-6 pb-3 flex items-center justify-center">
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-relaxed text-center break-words">
                {currentReceipt.content}
              </p>
            </div>

            <div className="flex-shrink-0 px-6 pb-4">
              <div className="text-xs font-semibold tracking-wide uppercase opacity-70 mb-1.5 text-center">
                When
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2 text-center text-sm break-words">
                {formatWhenBucketLabel(currentReceipt.when_bucket)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={handleDone}
            disabled={isDeleting}
            className="px-6 py-3 rounded-lg bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 shadow-sm hover:bg-green-100 dark:hover:bg-green-900/50 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Mark as done and delete mental note"
          >
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-700 dark:text-green-400" />
              <span className="font-semibold text-green-700 dark:text-green-400 text-sm">
                Done
              </span>
            </div>
          </button>

          <button
            onClick={handleSkip}
            className="px-6 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
            aria-label="Skip to next mental note"
          >
            <div className="flex items-center gap-2">
              <SkipForward className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <span className="font-semibold text-blue-700 dark:text-blue-400 text-sm">
                Skip
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
