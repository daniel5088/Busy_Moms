import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import type {
  InstacartRecipeRequest,
  InstacartRecipeResponse,
  Recipe,
} from '../types/database';
import { logger } from '../utils/logger';

const PARTNER_LINKBACK_URL = 'busymoms://shopping?tab=recipes';

/**
 * Create an Instacart recipe page
 */
export async function createRecipePage(
  request: InstacartRecipeRequest
): Promise<InstacartRecipeResponse | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      throw new Error('No authentication session');
    }

    const response = await fetch(
      `${config.supabaseUrl}/functions/v1/instacart-recipes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          ...request,
          partner_linkback_url: request.partner_linkback_url || PARTNER_LINKBACK_URL,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Instacart API error: ${error}`);
    }

    const data = await response.json();
    logger.debug('✅ Instacart recipe page created successfully');
    return data as InstacartRecipeResponse;
  } catch (error) {
    logger.error('❌ Create recipe page error:', error);
    return null;
  }
}

/**
 * Check if cached URL is still valid (more than 1 day from expiration)
 */
export function getCachedUrl(cachedUrl: string | null, expiresAt: string | null): string | null {
  if (!cachedUrl || !expiresAt) {
    return null;
  }

  const expirationDate = new Date(expiresAt);
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Return cached URL only if it expires more than 24 hours from now
  if (expirationDate > oneDayFromNow) {
    return cachedUrl;
  }

  return null;
}

/**
 * Calculate expiration date (default 30 days from now)
 */
export function calculateExpiresAt(days: number = 30): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt.toISOString();
}

/**
 * Get or create Instacart recipe URL with caching
 */
export async function getInstacartRecipeUrl(
  recipe: Recipe,
  ingredients: Array<{
    name: string;
    display_text: string;
    quantity?: number | null;
    unit?: string | null;
    brand_filters?: string[] | null;
    health_filters?: string[] | null;
  }>
): Promise<string | null> {
  try {
    // Check if we have a valid cached URL
    const cachedUrl = getCachedUrl(recipe.instacart_recipe_url || null, recipe.url_expires_at || null);
    if (cachedUrl) {
      logger.debug('✅ Using cached Instacart recipe URL');
      return cachedUrl;
    }

    // Create new Instacart recipe page
    const response = await createRecipePage({
      title: recipe.title,
      author: recipe.author || undefined,
      image_url: recipe.image_url || undefined,
      servings: recipe.servings || undefined,
      cooking_time: recipe.cooking_time_minutes || undefined,
      instructions: recipe.instructions || [],
      ingredients: ingredients.map((ing) => ({
        name: ing.name,
        display_text: ing.display_text,
        quantity: ing.quantity || undefined,
        unit: ing.unit || undefined,
        brand_filters: ing.brand_filters || undefined,
        health_filters: ing.health_filters || undefined,
      })),
      enable_pantry_items: true,
      expires_in: 30, // 30 days
    });

    if (!response) {
      return null;
    }

    // Update recipe with new URL and expiration
    const expiresAt = calculateExpiresAt(30);
    const { error } = await supabase
      .from('recipes')
      .update({
        instacart_recipe_url: response.products_link_url,
        url_expires_at: expiresAt,
      })
      .eq('id', recipe.id);

    if (error) {
      console.error('❌ Error updating recipe with Instacart URL:', error);
      // Still return the URL even if cache update fails
    }

    return response.products_link_url;
  } catch (error) {
    logger.error('❌ Get Instacart recipe URL error:', error);
    return null;
  }
}
