import React from 'react';
import { ExternalLink, Sparkles, Tag } from 'lucide-react';
import type { AffiliateMatrixItem } from '../lib/supabase';

interface AffiliateResultsProps {
  results: AffiliateMatrixItem[];
  onLinkClick?: (url: string, item: AffiliateMatrixItem) => void;
}

export function AffiliateResults({ results, onLinkClick }: AffiliateResultsProps) {
  if (results.length === 0) {
    return null;
  }

  const handleClick = (item: AffiliateMatrixItem) => {
    if (item.affiliate_url && onLinkClick) {
      onLinkClick(item.affiliate_url, item);
    } else if (item.affiliate_url) {
      window.open(item.affiliate_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-pink-500" />
        <h3 className="text-lg font-semibold text-gray-900">Curated Gift Suggestions</h3>
      </div>

      <p className="text-sm text-gray-600">
        Hand-picked affiliate gifts matching your criteria. Click to explore!
      </p>

      {/* Results Grid */}
      <div className="grid grid-cols-1 gap-3">
        {results.map((item, index) => (
          <div
            key={item.Sheet_id || index}
            className="group bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => handleClick(item)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Search Phrase / Description */}
                {item.search_phrase && (
                  <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                    {item.search_phrase}
                  </h4>
                )}

                {/* Metadata Tags */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {item.relationship_label && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                      <Tag className="w-3 h-3" />
                      {item.relationship_label}
                    </span>
                  )}
                  {item.age_group_label && (
                    <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      {item.age_group_label}
                    </span>
                  )}
                  {item.gender_label && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {item.gender_label}
                    </span>
                  )}
                  {item.budget_label && (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                      {item.budget_label}
                    </span>
                  )}
                </div>
              </div>

              {/* Link Icon */}
              {item.affiliate_url && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center group-hover:bg-pink-600 transition-colors">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </div>
              )}
            </div>

            {/* Affiliate URL Preview */}
            {item.affiliate_url && (
              <div className="mt-3 pt-3 border-t border-pink-200">
                <p className="text-xs text-gray-500 truncate">
                  {new URL(item.affiliate_url).hostname}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p className="font-medium mb-1">About These Suggestions</p>
        <p>
          These are curated affiliate links to trusted retailers. We may earn a commission from
          purchases made through these links at no extra cost to you.
        </p>
      </div>
    </div>
  );
}
