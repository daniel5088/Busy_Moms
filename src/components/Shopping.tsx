import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  ShoppingCart,
  Repeat,
  Star,
  ExternalLink,
  ChefHat,
  Store,
  Edit,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Milk,
  Apple,
  Wheat,
  Drumstick,
  Package,
} from 'lucide-react';
import { ShoppingForm } from './forms/ShoppingForm';
import {
  ShoppingItem,
  FamilyMember,
  Recipe,
  supabase,
  ProviderName,
  UserPreferredRetailer,
} from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { RecipeBrowser } from './RecipeBrowser';
import { RecipeDetailModal } from './RecipeDetailModal';
import { SendToProviderModal } from './SendToProviderModal';
import { instacartShoppingService } from '../services/instacartShoppingService';
import { InstacartButton } from './InstacartButton';
import { measurementPreferencesService, ConvertedMeasurement } from '../services/measurementPreferencesService';

interface ShoppingProps {
  openRecipesTab?: boolean;
  onRecipesTabOpened?: () => void;
}

const POPULAR_ITEMS = [
  { name: 'Milk', quantity: 1, unit: 'gallon', category: 'dairy' },
  { name: 'Eggs', quantity: 12, unit: null, category: 'dairy' },
  { name: 'Bread', quantity: 1, unit: 'loaf', category: 'bakery' },
  { name: 'Bananas', quantity: 1, unit: 'bunch', category: 'produce' },
  { name: 'Chicken Breast', quantity: 1, unit: 'lb', category: 'meat' },
  { name: 'Rice', quantity: 1, unit: 'bag', category: 'pantry' },
  { name: 'Pasta', quantity: 1, unit: 'box', category: 'pantry' },
  { name: 'Apples', quantity: 6, unit: null, category: 'produce' },
  { name: 'Yogurt', quantity: 1, unit: 'container', category: 'dairy' },
  { name: 'Cheese', quantity: 1, unit: 'block', category: 'dairy' },
  { name: 'Spinach', quantity: 1, unit: 'bag', category: 'produce' },
  { name: 'Cereal', quantity: 1, unit: 'box', category: 'pantry' },
];

const CATEGORY_ICONS = {
  dairy: Milk,
  produce: Apple,
  bakery: Wheat,
  meat: Drumstick,
  pantry: Package,
};

export function Shopping({ openRecipesTab = false, onRecipesTabOpened }: ShoppingProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [showShoppingForm, setShowShoppingForm] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendProvider, setSendProvider] = useState<ProviderName>(null);
  const [sendingToProvider, setSendingToProvider] = useState(false);
  const [preferredRetailer, setPreferredRetailer] = useState<UserPreferredRetailer | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [convertedItems, setConvertedItems] = useState<Map<string, ConvertedMeasurement>>(new Map());
  const [instacartOnboarded, setInstacartOnboarded] = useState(false);
  const [showInstacartWelcome, setShowInstacartWelcome] = useState(false);
  const [shoppingView, setShoppingView] = useState<'browse' | 'cart'>('browse');
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [toastTimeout, setToastTimeout] = useState<NodeJS.Timeout | null>(null);

  const completeInstacartOnboarding = useCallback(() => {
    localStorage.setItem('bma_instacart_onboarded', 'true');
    localStorage.removeItem('bma_instacart_pending_login');
    setInstacartOnboarded(true);
    setShowInstacartWelcome(false);
  }, []);

  useEffect(() => {
    const onboarded = localStorage.getItem('bma_instacart_onboarded');
    if (onboarded === 'true') {
      setInstacartOnboarded(true);
    }
  }, []);

  useEffect(() => {
    const handleReturnDetection = () => {
      const pending = localStorage.getItem('bma_instacart_pending_login');

      if (pending === 'true' && !instacartOnboarded) {
        completeInstacartOnboarding();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReturnDetection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleReturnDetection);
    window.addEventListener('pageshow', handleReturnDetection);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleReturnDetection);
      window.removeEventListener('pageshow', handleReturnDetection);
    };
  }, [instacartOnboarded, completeInstacartOnboarding]);

  useEffect(() => {
    if (user?.id) {
      fetchShoppingList();
      fetchFamilyMembers();
      fetchPreferredRetailer();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  // Auto-open recipes tab if prop is set
  useEffect(() => {
    if (openRecipesTab) {
      setActiveTab('recipes');
      if (onRecipesTabOpened) {
        onRecipesTabOpened();
      }
    }
  }, [openRecipesTab, onRecipesTabOpened]);

  // TEMP: Safety fallback - redirect to 'list' if 'auto' tab is selected (hidden feature)
  useEffect(() => {
    if (activeTab === 'auto') {
      setActiveTab('list');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!user || shoppingList.length === 0) return;

    async function convertItems() {
      const conversions = new Map<string, ConvertedMeasurement>();

      for (const item of shoppingList) {
        if (item.quantity && item.unit) {
          const converted = await measurementPreferencesService.convertForDisplay(
            user.id,
            { quantity: item.quantity, unit: item.unit }
          );
          conversions.set(item.id, converted);
        }
      }

      setConvertedItems(conversions);
    }

    convertItems();
  }, [user, shoppingList]);

  const fetchShoppingList = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data: shoppingData, error: shoppingError } = await supabase
        .from('shopping_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (shoppingError) throw shoppingError;
      setShoppingList(shoppingData || []);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    if (!user?.id) return;

    try {
      const { data: members, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (!error) {
        setFamilyMembers(members || []);
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  const fetchPreferredRetailer = async () => {
    if (!user?.id) return;

    try {
      const retailer = await instacartShoppingService.getPrimaryRetailer(user.id);
      setPreferredRetailer(retailer);
    } catch (error) {
      console.error('Error loading preferred retailer:', error);
    }
  };

  const handleItemCreated = (newItem: ShoppingItem) => {
    // Refresh the list to get the assigned family member data
    fetchShoppingList();
    setEditingItem(null);
  };

  const handleQuickAdd = async (popularItem: typeof POPULAR_ITEMS[0]) => {
    if (!user?.id) return;

    try {
      const itemData = {
        item: popularItem.name,
        category: popularItem.category,
        quantity: popularItem.quantity,
        unit: popularItem.unit,
        original_unit: popularItem.unit,
        urgent: false,
        notes: '',
        provider_name: null,
        assigned_to_email: null,
        user_id: user.id,
        completed: false,
        purchase_status: 'not_sent',
      };

      const { error } = await supabase.from('shopping_lists').insert([itemData]).select().single();

      if (error) throw error;

      await fetchShoppingList();

      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }

      setToast({ open: true, message: `${popularItem.name} successfully added to cart` });

      const timeout = setTimeout(() => {
        setToast({ open: false, message: '' });
      }, 1500);

      setToastTimeout(timeout);
    } catch (error) {
      console.error('Error adding quick item:', error);
      alert('Failed to add item. Please try again.');
    }
  };

  const handleEditItem = (item: ShoppingItem) => {
    setEditingItem(item);
    setShowShoppingForm(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from('shopping_lists').delete().eq('id', itemId);

      if (error) throw error;

      // Remove from local state
      setShoppingList((prev) => prev.filter((item) => item.id !== itemId));

      // Remove from selection if it was selected
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting shopping item:', error);
      alert('Error deleting item. Please try again.');
    }
  };

  const handleCloseForm = () => {
    setShowShoppingForm(false);
    setEditingItem(null);
  };

  const toggleItemCompleted = async (itemId: string) => {
    const item = shoppingList.find((i) => i.id === itemId);
    if (!item) return;

    const { error } = await supabase
      .from('shopping_lists')
      .update({ completed: !item.completed })
      .eq('id', itemId);

    if (!error) {
      setShoppingList((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i))
      );
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    const filteredItems = getFilteredItems();
    setSelectedItems(new Set(filteredItems.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const getFilteredItems = () => {
    return shoppingList.filter((item) => !item.completed);
  };

  const handleSendToProvider = (provider: ProviderName) => {
    setSendProvider(provider);
    setShowSendModal(true);
  };

  const handleConfirmSend = async (items: ShoppingItem[], retailerKey?: string): Promise<string | undefined> => {
    if (!sendProvider) return;

    setSendingToProvider(true);
    try {
      let cartUrl: string | undefined;

      if (sendProvider === 'instacart') {
        const response = await instacartShoppingService.sendToInstacart(items, retailerKey);
        cartUrl = response.products_link_url;
        console.log('✅ Cart URL received:', cartUrl);
      }

      await fetchShoppingList();
      clearSelection();

      return cartUrl;
    } catch (error) {
      console.error('Error sending to provider:', error);
      throw error;
    } finally {
      setSendingToProvider(false);
    }
  };

  const getItemsToSend = (): ShoppingItem[] => {
    if (selectedItems.size > 0) {
      return shoppingList.filter((item) => selectedItems.has(item.id));
    }
    return getFilteredItems();
  };

  const handleOpenInstacart = () => {
    localStorage.setItem('bma_instacart_pending_login', 'true');
    window.open('https://www.instacart.com', '_blank', 'noopener,noreferrer');
    setShowInstacartWelcome(true);
  };

  // TEMP: Auto-Reorder data hidden until feature is functional
  /* const autoReorders = [
    { item: 'Huggies Size 3', nextOrder: 'March 20', frequency: 'Every 2 weeks', price: '$42.99' },
    { item: 'Formula Powder', nextOrder: 'March 18', frequency: 'Weekly', price: '$28.99' },
    { item: 'Organic Milk', nextOrder: 'March 22', frequency: 'Every 3 days', price: '$6.99' },
  ]; */

  return (
    <main className="h-screen overflow-y-auto pb-20 sm:pb-24 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Shopping
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Smart lists and suggestions
            </p>
          </div>
          {!(activeTab === 'list' && instacartOnboarded) && (
            <button type="button" onClick={() => setShowShoppingForm(true)} aria-label="Add new item" className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-0.5 sm:space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1" role="tablist" aria-label="Shopping sections">
          {[
            { id: 'list', label: 'Shopping List', icon: ShoppingCart },
            { id: 'recipes', label: 'Recipes', icon: ChefHat },
            // TEMP: Auto-Reorder hidden until feature is functional. Re-enable by uncommenting line below.
            // { id: 'auto', label: 'Auto-Reorder', icon: Repeat },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-1.5 sm:py-2 px-1 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-900 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Action Row - Below Tabs */}
        {activeTab === 'list' && instacartOnboarded && (
          <div className="mt-4">
            {shoppingView === 'browse' ? (
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setShowShoppingForm(true)}
                  className="w-full h-10 flex items-center justify-center gap-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Add Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShoppingView('cart')}
                  className="w-full h-10 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium relative"
                >
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                  <span>View Cart</span>
                  {getFilteredItems().length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {getFilteredItems().length}
                    </span>
                  )}
                </button>
                <InstacartButton
                  variant="dark"
                  text="Shop with Instacart"
                  onClick={() => handleSendToProvider('instacart')}
                  disabled={false}
                  fullWidth
                  className="!h-10 !rounded-lg"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShoppingView('browse')}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowShoppingForm(true)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Add Item</span>
                </button>
                <div className="flex-1">
                  <InstacartButton
                    variant="dark"
                    text="Shop with Instacart"
                    onClick={() => handleSendToProvider('instacart')}
                    disabled={getItemsToSend().length === 0}
                    showCount={selectedItems.size > 0 ? selectedItems.size : undefined}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="p-4 sm:p-6">
        {/* Shopping List Tab */}
        {activeTab === 'list' && (
          <div className="space-y-4" id="list-panel" role="tabpanel" aria-labelledby="list-tab">
            {/* Instacart Onboarding Gate */}
            {!instacartOnboarded ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 text-center">
                  <div className="mb-6">
                    <img
                      src="/instacart_carrot.svg"
                      alt="Instacart"
                      className="h-16 w-auto mx-auto mb-4"
                    />
                    <h2 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Shop with Instacart
                    </h2>
                    {!showInstacartWelcome && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        To shop with Instacart, please log in once
                      </p>
                    )}
                  </div>

                  {!showInstacartWelcome ? (
                    <InstacartButton
                      variant="dark"
                      text="Create an account or log in to Instacart"
                      onClick={handleOpenInstacart}
                      fullWidth
                    />
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        After logging in, come back and tap Continue.
                      </p>
                      <button
                        type="button"
                        onClick={completeInstacartOnboarding}
                        className="w-full px-6 py-3 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition-colors text-sm"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open('https://www.instacart.com', '_blank', 'noopener,noreferrer')}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
                      >
                        Open Instacart again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Browse View */}
                {shoppingView === 'browse' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Popular Items
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {POPULAR_ITEMS.map((item, index) => {
                        const CategoryIcon = CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS];
                        return (
                          <div
                            key={index}
                            className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 min-h-[115px] hover:border-green-400 dark:hover:border-green-500 transition-all relative flex flex-col"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                <CategoryIcon className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                              </div>
                              <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-xs">
                                {item.category}
                              </span>
                            </div>
                            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-auto">
                              {item.name}
                            </h3>
                            <div className="flex justify-end mt-2">
                              <button
                                type="button"
                                onClick={() => handleQuickAdd(item)}
                                aria-label={`Add ${item.name} to cart`}
                                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors shadow-sm"
                              >
                                Add +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cart View */}
                {shoppingView === 'cart' && (
                  <>
                    {/* Selection Controls */}
                    {!loading && getFilteredItems().length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {selectedItems.size > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear Selection ({selectedItems.size})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={selectAllItems}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Select All
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-500" role="status" aria-label="Loading shopping list"></div>
                <span className="ml-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Loading shopping list...
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredItems().map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`group p-3 sm:p-4 rounded-xl border-2 transition-all ${
                        selectedItems.has(item.id)
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-500'
                          : item.urgent
                            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-600'
                            : 'bg-white border-gray-200 hover:border-green-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-green-500'
                      }`}
                    >
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          aria-label={`Select ${item.item}`}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 rounded focus:ring-green-500 mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 break-words">
                              {item.item}
                            </h3>
                            <div className="flex items-center gap-2">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditItem(item)}
                                  aria-label={`Edit ${item.item}`}
                                  className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  aria-label={`Delete ${item.item}`}
                                  className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <p>
                              {item.category}
                              {(() => {
                                const converted = convertedItems.get(item.id);
                                const qty = converted?.displayQuantity ?? item.quantity;
                                const unit = converted?.displayUnit ?? item.unit;
                                if (qty && unit) {
                                  return ` • ${qty} ${unit}`;
                                } else if (qty && qty > 1) {
                                  return ` (${qty})`;
                                }
                                return '';
                              })()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.provider_metadata?.retailer_name && (
                              <div
                                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  preferredRetailer?.retailer_key ===
                                  item.provider_metadata?.retailer_key
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <Store className="w-3 h-3" aria-hidden="true" />
                                <span>
                                  {item.provider_metadata.retailer_name}
                                  {preferredRetailer?.retailer_key ===
                                    item.provider_metadata?.retailer_key && (
                                    <span className="ml-1 font-semibold">(Preferred Retailer)</span>
                                  )}
                                </span>
                              </div>
                            )}
                            {item.urgent && (
                              <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
                                Urgent
                              </div>
                            )}
                            {item.provider_metadata?.cart_url && (
                              <a
                                href={item.provider_metadata.cart_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`View cart for ${item.item}`}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                <ShoppingCart className="w-3 h-3" aria-hidden="true" />
                                <span>View Cart</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && (
              <button
                type="button"
                onClick={() => setShowShoppingForm(true)}
                className="w-full py-3 sm:py-4 border-2 border-dashed border-gray-300 rounded-xl text-sm sm:text-base text-gray-600 hover:border-green-400 hover:text-green-600 transition-all"
              >
                + Add Item
              </button>
            )}

            {!loading && shoppingList.filter((item) => !item.completed).length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Your shopping list is empty
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                  Add items to get started with smart shopping
                </p>
                <button
                  type="button"
                  onClick={() => setShowShoppingForm(true)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors text-sm sm:text-base"
                >
                  Add First Item
                </button>
              </div>
            )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Recipes Tab */}
        {activeTab === 'recipes' && (
          <div id="recipes-panel" role="tabpanel" aria-labelledby="recipes-tab">
            <RecipeBrowser onRecipeSelect={(recipe) => setSelectedRecipe(recipe)} />
          </div>
        )}

        {/* TEMP: Auto-Reorder Tab - Hidden until feature is functional. Re-enable by removing comment block.
        {activeTab === 'auto' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <h3 className="font-medium text-green-900 mb-2 text-sm sm:text-base">
                Smart Reordering Active
              </h3>
              <p className="text-xs sm:text-sm text-green-700">
                We automatically reorder essentials based on your family's usage patterns
              </p>
            </div>

            {autoReorders.map((item, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{item.item}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-base sm:text-lg font-bold text-green-600">
                      {item.price}
                    </span>
                    <div className="w-6 h-3 sm:w-8 sm:h-4 bg-green-500 rounded-full relative">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full absolute top-0.5 right-0.5 shadow"></div>
                    </div>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Next order:</span> {item.nextOrder}
                  </p>
                  <p>
                    <span className="font-medium">Frequency:</span> {item.frequency}
                  </p>
                </div>
                <div className="flex space-x-2 mt-3 flex-wrap gap-1">
                  <button className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm hover:bg-gray-200 transition-colors">
                    Order Now
                  </button>
                  <button className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm hover:bg-gray-200 transition-colors">
                    Edit Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        */}
      </div>

      <ShoppingForm
        isOpen={showShoppingForm}
        onClose={handleCloseForm}
        onItemCreated={handleItemCreated}
        editItem={editingItem}
      />

      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onIngredientsAdded={() => {
            fetchShoppingList();
            setSelectedRecipe(null);
          }}
          onRecipeDeleted={() => {
            setSelectedRecipe(null);
            // Refresh will happen when returning to recipes tab
          }}
        />
      )}

      {user?.id && (
        <SendToProviderModal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          items={getItemsToSend()}
          provider={sendProvider}
          onConfirm={handleConfirmSend}
          userId={user.id}
        />
      )}

      {toast.open && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-white dark:bg-gray-800 border-2 border-green-500 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-sm">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{toast.message}</p>
          </div>
        </div>
      )}
    </main>
  );
}
