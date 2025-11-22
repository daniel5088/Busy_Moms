import React, { useState, useMemo } from 'react';
import { ArrowLeft, Save, Filter, ChevronDown } from 'lucide-react';
import { GiftMatrixItem, GiftCategory } from '../lib/supabase';
import { GiftCard } from './GiftCard';
import { GiftFinderFormData } from './GiftFinderForm';

interface GiftResultsDisplayProps {
  gifts: GiftMatrixItem[];
  searchCriteria: GiftFinderFormData;
  onBackToForm: () => void;
  onSaveSearch: () => void;
  onGiftClick: (gift: GiftMatrixItem) => void;
  loading?: boolean;
  clickingGiftId?: string | null;
}

type SortOption = 'popular' | 'rating' | 'price_low' | 'price_high';

export function GiftResultsDisplay({
  gifts,
  searchCriteria,
  onBackToForm,
  onSaveSearch,
  onGiftClick,
  loading = false,
  clickingGiftId
}: GiftResultsDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<GiftCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique categories from results
  const availableCategories = useMemo(() => {
    const cats = new Set(gifts.map(g => g.category));
    return Array.from(cats);
  }, [gifts]);

  // Filter and sort gifts
  const filteredAndSortedGifts = useMemo(() => {
    let filtered = [...gifts];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(g => g.category === selectedCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.popularity_score - a.popularity_score;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'price_low':
          return a.typical_price - b.typical_price;
        case 'price_high':
          return b.typical_price - a.typical_price;
        default:
          return 0;
      }
    });

    return filtered;
  }, [gifts, selectedCategory, sortBy]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (gifts.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Gifts Found</h3>
          <p className="text-gray-600 mb-6">
            We couldn't find any gifts matching your criteria. Try adjusting your search:
          </p>
          <ul className="text-left space-y-2 mb-6 text-gray-600">
            <li>• Increase your budget range</li>
            <li>• Select "Unisex" for more options</li>
            <li>• Try a different age range</li>
            <li>• Remove category filters</li>
          </ul>
          <button
            onClick={onBackToForm}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Refine Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-2 text-white hover:text-purple-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Search</span>
          </button>
          <button
            onClick={onSaveSearch}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span className="font-medium">Save Search</span>
          </button>
        </div>
        <h2 className="text-2xl font-bold mb-2">Gift Ideas for {searchCriteria.recipient_name}</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full">
            Age {searchCriteria.recipient_age}
          </span>
          <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full">
            {searchCriteria.recipient_gender === 'Other' ? 'Unisex' : searchCriteria.recipient_gender}
          </span>
          <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full">
            {formatPrice(searchCriteria.budget_min)} - {formatPrice(searchCriteria.budget_max)}
          </span>
          <span className="px-3 py-1 bg-white bg-opacity-30 rounded-full font-semibold">
            {filteredAndSortedGifts.length} {filteredAndSortedGifts.length === 1 ? 'Gift' : 'Gifts'}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-gray-700 font-medium mb-3 lg:hidden"
        >
          <Filter className="w-4 h-4" />
          <span>Filters & Sort</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <div className={`space-y-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          {/* Category Filter */}
          {availableCategories.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All ({gifts.length})
                </button>
                {availableCategories.map(cat => {
                  const count = gifts.filter(g => g.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                        selectedCategory === cat
                          ? 'bg-purple-500 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {cat.replace('_', ' ')} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full lg:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <span className="ml-3 text-lg text-gray-600">Loading gifts...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedGifts.map(gift => (
              <GiftCard
                key={gift.id}
                gift={gift}
                onShopClick={onGiftClick}
                isLoading={clickingGiftId === gift.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
