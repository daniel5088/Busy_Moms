import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import type {
  ShoppingItem,
  InstacartShoppingListRequest,
  InstacartShoppingListResponse,
  GetNearbyRetailersRequest,
  GetNearbyRetailersResponse,
  UserPreferredRetailer,
  Retailer,
} from '../types/database';
import { MeasurementConverter } from '../utils/measurementConverter';
import { InstacartUnitMapper } from '../utils/instacartUnitMapper';

interface FormattedInstacartItem {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
}

/**
 * Normalize a shopping item for Instacart with conservative validation
 */
function normalizeShoppingItemForInstacart(item: ShoppingItem): FormattedInstacartItem | null {
  // Validate quantity
  if (!item.quantity || item.quantity <= 0 || item.quantity > 10000) {
    console.warn(`Skipping item "${item.item}": invalid quantity`, item.quantity);
    return null;
  }

  // Handle null units (count-based items)
  if (!item.unit) {
    return {
      name: item.item,
      quantity: item.quantity,
      unit: 'item',
      category: item.category || 'other',
    };
  }

  // Normalize unit
  const normalizedUnit = MeasurementConverter.normalizeUnit(item.unit);

  // Skip non-standard units that Instacart doesn't support
  const nonStandardUnits = ['pinch', 'dash', 'to taste', 'handful', 'some', 'a little'];
  if (nonStandardUnits.includes(normalizedUnit.toLowerCase())) {
    console.warn(`Skipping item "${item.item}": non-standard unit "${item.unit}"`);
    return null;
  }

  // Map to Instacart-compatible unit
  const formatted = InstacartUnitMapper.formatForInstacart(
    item.quantity,
    normalizedUnit,
    item.category || 'other'
  );

  // Validate result
  if (!formatted.unit || formatted.quantity <= 0) {
    console.warn(`Skipping item "${item.item}": failed unit mapping`);
    return null;
  }

  // Round quantity to 2 decimals
  const roundedQuantity = Math.round(formatted.quantity * 100) / 100;

  return {
    name: item.item,
    quantity: roundedQuantity,
    unit: formatted.unit,
    category: item.category || 'other',
  };
}

/**
 * Format shopping items for Instacart API
 */
function formatItemsForInstacart(items: ShoppingItem[]): FormattedInstacartItem[] {
  const formatted: FormattedInstacartItem[] = [];
  const skipped: string[] = [];

  for (const item of items) {
    const formattedItem = normalizeShoppingItemForInstacart(item);
    if (formattedItem) {
      formatted.push(formattedItem);
    } else {
      skipped.push(item.item);
    }
  }

  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} items with invalid units:`, skipped);
  }

  return formatted;
}

/**
 * Send shopping items to Instacart
 */
export async function sendToInstacart(
  items: ShoppingItem[],
  retailerKey?: string
): Promise<InstacartShoppingListResponse | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      throw new Error('No authentication session');
    }

    // Format items
    const formattedItems = formatItemsForInstacart(items);

    if (formattedItems.length === 0) {
      throw new Error('No valid items to send to Instacart');
    }

    // Call edge function
    const request: InstacartShoppingListRequest & { retailer_key?: string } = {
      items: formattedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      })),
      title: `Shopping List - ${new Date().toLocaleDateString()}`,
    };

    if (retailerKey) {
      (request as any).retailer_key = retailerKey;
    }

    const response = await fetch(
      `${config.supabaseUrl}/functions/v1/instacart-shopping-list`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Instacart API error: ${error}`);
    }

    const data = await response.json();

    // Update shopping items with provider info
    const itemIds = items.map((item) => item.id);
    const timestamp = new Date().toISOString();

    // Get retailer name if retailer_key provided
    let retailerName: string | undefined;
    if (retailerKey) {
      const retailer = await getRetailerByKey(retailerKey);
      retailerName = retailer?.retailer_name;
    }

    await supabase
      .from('shopping_lists')
      .update({
        provider_name: 'instacart',
        purchase_status: 'in_cart',
        provider_synced_at: timestamp,
        provider_metadata: {
          cart_url: data.products_link_url,
          timestamp,
          retailer_key: retailerKey,
          retailer_name: retailerName,
        },
      })
      .in('id', itemIds);

    console.log(`✅ ${items.length} items sent to Instacart successfully`);
    return data as InstacartShoppingListResponse;
  } catch (error) {
    console.error('❌ Send to Instacart error:', error);
    return null;
  }
}

/**
 * Get nearby retailers by postal code
 */
export async function getNearbyRetailers(
  postalCode: string,
  countryCode: 'US' | 'CA' = 'US'
): Promise<Retailer[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      throw new Error('No authentication session');
    }

    const request: GetNearbyRetailersRequest = {
      postal_code: postalCode,
      country_code: countryCode,
    };

    const response = await fetch(
      `${config.supabaseUrl}/functions/v1/instacart-get-retailers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Instacart API error: ${error}`);
    }

    const data = (await response.json()) as GetNearbyRetailersResponse;
    return data.retailers || [];
  } catch (error) {
    console.error('❌ Get nearby retailers error:', error);
    return [];
  }
}

/**
 * Get user's preferred retailers
 */
export async function getPreferredRetailers(userId: string): Promise<UserPreferredRetailer[]> {
  try {
    const { data, error } = await supabase
      .from('user_preferred_retailers')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching preferred retailers:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Get preferred retailers error:', error);
    return [];
  }
}

/**
 * Get user's primary retailer
 */
export async function getPrimaryRetailer(userId: string): Promise<UserPreferredRetailer | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferred_retailers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching primary retailer:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Get primary retailer error:', error);
    return null;
  }
}

/**
 * Save a preferred retailer
 */
export async function savePreferredRetailer(
  userId: string,
  retailer: Retailer,
  isPrimary: boolean = false
): Promise<UserPreferredRetailer | null> {
  try {
    // Check if retailer already exists
    const existing = await checkRetailerExists(userId, retailer.retailer_key);

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('user_preferred_retailers')
        .update({ is_primary: isPrimary })
        .eq('user_id', userId)
        .eq('retailer_key', retailer.retailer_key)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Get next display_order
    const retailers = await getPreferredRetailers(userId);
    const nextOrder = retailers.length;

    // If setting as primary, unset other primary retailers
    if (isPrimary) {
      await supabase
        .from('user_preferred_retailers')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
    }

    // Insert new
    const { data, error } = await supabase
      .from('user_preferred_retailers')
      .insert({
        user_id: userId,
        retailer_key: retailer.retailer_key,
        retailer_name: retailer.name,
        retailer_logo_url: retailer.retailer_logo_url,
        is_primary: isPrimary,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving preferred retailer:', error);
      throw error;
    }

    console.log('✅ Preferred retailer saved successfully');
    return data;
  } catch (error) {
    console.error('❌ Save preferred retailer error:', error);
    return null;
  }
}

/**
 * Set a retailer as primary
 */
export async function setPrimaryRetailer(userId: string, retailerId: string): Promise<boolean> {
  try {
    // Unset all primary retailers
    await supabase
      .from('user_preferred_retailers')
      .update({ is_primary: false })
      .eq('user_id', userId)
      .eq('is_primary', true);

    // Set new primary
    const { error } = await supabase
      .from('user_preferred_retailers')
      .update({ is_primary: true })
      .eq('id', retailerId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error setting primary retailer:', error);
      throw error;
    }

    console.log('✅ Primary retailer set successfully');
    return true;
  } catch (error) {
    console.error('❌ Set primary retailer error:', error);
    return false;
  }
}

/**
 * Remove a preferred retailer
 */
export async function removePreferredRetailer(userId: string, retailerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_preferred_retailers')
      .delete()
      .eq('id', retailerId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error removing preferred retailer:', error);
      throw error;
    }

    console.log('✅ Preferred retailer removed successfully');
    return true;
  } catch (error) {
    console.error('❌ Remove preferred retailer error:', error);
    return false;
  }
}

/**
 * Check if a retailer exists in user's preferred retailers
 */
export async function checkRetailerExists(userId: string, retailerKey: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_preferred_retailers')
      .select('id')
      .eq('user_id', userId)
      .eq('retailer_key', retailerKey)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('❌ Check retailer exists error:', error);
    return false;
  }
}

/**
 * Get retailer by key
 */
async function getRetailerByKey(retailerKey: string): Promise<UserPreferredRetailer | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferred_retailers')
      .select('*')
      .eq('retailer_key', retailerKey)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Get retailer by key error:', error);
    return null;
  }
}
