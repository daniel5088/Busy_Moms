// src/services/instacartAgentService.ts

import { supabase } from '../lib/supabase';


export async function sendToInstacart(
  shoppingSentence: string,
  retailerKey?: string,
  postalCode?: string,
): Promise<any> {
  // Require a signed‑in user so you can secure the function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Please sign in first.');
  }

  const { data, error } = await supabase.functions.invoke('instacart-agent', {
    body: {
      shoppingSentence,
      // Accepted by your edge function but ignored when calling Connect
      retailer_key: retailerKey,
      postal_code: postalCode || '33328',
    },
  });

  if (error) {
    // error.message is usually enough, but data may include your JSON error body
    throw new Error(error.message || 'Failed to send Instacart request');
  }

  return data;
}

/**
 * Calls Supabase Edge Function: instacart-get-retailers
 */
export async function getNearbyRetailers(postalCode: string): Promise<any> {
  // requires logged in user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in first.');

  const { data, error } = await supabase.functions.invoke(
    'instacart-get-retailers',
    {
      body: {
        postal_code: postalCode,
        country_code: 'US',
      },
    },
  );

  if (error) {
    // error.message is usually enough, but data may include your JSON error body
    throw new Error(error.message || 'Failed to get nearby retailers');
  }

  return data;
}


export async function createInstacartList(
  items: Array<{ name: string; quantity?: number; unit?: string }>,
  retailerKey?: string,
): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in first.');

  const { data, error } = await supabase.functions.invoke(
    'instacart-shopping-list',
    {
      body: {
        action: 'create_shopping_list',
        title: 'My Shopping List',
        items,
        // accepted by your function but NOT forwarded to products_link
        retailer_key: retailerKey,
      },
    },
  );

  if (error) {
    throw new Error(error.message || 'Failed to create Instacart list');
  }

  return data; // should include { status, instacart_list_url, products_link_url }
}
