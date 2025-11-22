import React from 'react';
import { Gift, ExternalLink, Star, Package, Store } from 'lucide-react';
import { GiftMatrixItem } from '../lib/supabase';

interface GiftCardProps {
  gift: GiftMatrixItem;
  onShopClick: (gift: GiftMatrixItem) => void;
  isLoading?: boolean;
}

export function GiftCard({ gift, onShopClick, isLoading = false }: GiftCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getRetailerColor = (retailer: string) => {
    const lower = retailer.toLowerCase();
    if (lower.includes('amazon')) return 'bg-orange-100 text-orange-700';
    if (lower.includes('target')) return 'bg-red-100 text-red-700';
    if (lower.includes('walmart')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-200 hover:border-purple-300 flex flex-col h-full">
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100">
        {gift.image_url ? (
          <img
            src={gift.image_url}
            alt={gift.gift_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift className="w-16 h-16 text-purple-300" />
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-white px-3 py-1.5 rounded-full shadow-md">
          <span className="text-lg font-bold text-purple-600">
            {formatPrice(gift.typical_price)}
          </span>
        </div>

        {/* Rating Badge */}
        {gift.rating && (
          <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-full shadow-md flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-900">{gift.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
          {gift.gift_name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
          {gift.description}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            Ages {gift.min_age}-{gift.max_age}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
            {gift.category.replace('_', ' ')}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
            {gift.gender}
          </span>
        </div>

        {/* Retailer Badge */}
        <div className="mb-3">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRetailerColor(gift.retailer)}`}>
            <Store className="w-3 h-3" />
            <span>{gift.retailer}</span>
          </div>
        </div>

        {/* Shop Now Button */}
        <button
          onClick={() => onShopClick(gift)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Opening...</span>
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              <span>Shop on {gift.retailer}</span>
            </>
          )}
        </button>

        {/* Popularity Info */}
        {gift.click_count > 0 && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {gift.click_count} {gift.click_count === 1 ? 'person' : 'people'} viewed this
          </div>
        )}
      </div>
    </div>
  );
}
