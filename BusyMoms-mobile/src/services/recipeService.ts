import { supabase } from '../lib/supabase';
import type { Recipe, RecipeIngredient, UserSavedRecipe } from '../types/database';
import { IngredientParser } from '../utils/ingredientParser';
import { logger } from '../utils/logger';

export interface RecipeFilter {
  search?: string;
  author?: string;
  maxCookingTime?: number;
  minServings?: number;
  maxServings?: number;
}

export interface SimplifiedRecipe {
  id: string;
  title: string;
  description?: string;
  cuisine?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  imageUrl?: string;
  instructions?: string[];
  ingredients: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
  }[];
}

/**
 * Create a new recipe
 */
export async function createRecipe(
  recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>
): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase.from('recipes').insert(recipe).select().single();

    if (error) {
      console.error('❌ Error creating recipe:', error);
      throw error;
    }

    logger.debug('✅ Recipe created successfully');
    return data;
  } catch (error) {
    logger.error('❌ Recipe create error:', error);
    return null;
  }
}

/**
 * Get a single recipe by ID
 */
export async function getRecipe(recipeId: string): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching recipe:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('❌ Recipe fetch error:', error);
    return null;
  }
}

/**
 * Get recipes for a user with optional filtering
 */
export async function getRecipes(userId: string, filter?: RecipeFilter): Promise<Recipe[]> {
  try {
    let query = supabase
      .from('recipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filter?.search) {
      query = query.or(`title.ilike.%${filter.search}%,author.ilike.%${filter.search}%`);
    }

    if (filter?.author) {
      query = query.ilike('author', `%${filter.author}%`);
    }

    if (filter?.maxCookingTime) {
      query = query.lte('cooking_time_minutes', filter.maxCookingTime);
    }

    if (filter?.minServings) {
      query = query.gte('servings', filter.minServings);
    }

    if (filter?.maxServings) {
      query = query.lte('servings', filter.maxServings);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching recipes:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('❌ Recipes fetch error:', error);
    return [];
  }
}

/**
 * Update a recipe
 */
export async function updateRecipe(
  recipeId: string,
  updates: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>>
): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', recipeId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating recipe:', error);
      throw error;
    }

    logger.debug('✅ Recipe updated successfully');
    return data;
  } catch (error) {
    logger.error('❌ Recipe update error:', error);
    return null;
  }
}

/**
 * Delete a recipe (cascades to ingredients)
 */
export async function deleteRecipe(recipeId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('recipes').delete().eq('id', recipeId);

    if (error) {
      console.error('❌ Error deleting recipe:', error);
      throw error;
    }

    logger.debug('✅ Recipe deleted successfully');
    return true;
  } catch (error) {
    logger.error('❌ Recipe delete error:', error);
    return false;
  }
}

/**
 * Add ingredients to a recipe
 */
export async function addIngredients(
  ingredients: Omit<RecipeIngredient, 'id' | 'created_at'>[]
): Promise<RecipeIngredient[]> {
  try {
    const { data, error } = await supabase.from('recipe_ingredients').insert(ingredients).select();

    if (error) {
      console.error('❌ Error adding ingredients:', error);
      throw error;
    }

    logger.debug(`✅ ${data.length} ingredients added successfully`);
    return data || [];
  } catch (error) {
    logger.error('❌ Add ingredients error:', error);
    return [];
  }
}

/**
 * Get ingredients for a recipe
 */
export async function getIngredients(recipeId: string): Promise<RecipeIngredient[]> {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching ingredients:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ingredients fetch error:', error);
    return [];
  }
}

/**
 * Update a recipe ingredient
 */
export async function updateIngredient(
  ingredientId: string,
  updates: Partial<Omit<RecipeIngredient, 'id' | 'created_at'>>
): Promise<RecipeIngredient | null> {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .update(updates)
      .eq('id', ingredientId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating ingredient:', error);
      throw error;
    }

    logger.debug('✅ Ingredient updated successfully');
    return data;
  } catch (error) {
    logger.error('❌ Ingredient update error:', error);
    return null;
  }
}

/**
 * Delete a recipe ingredient
 */
export async function deleteIngredient(ingredientId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('recipe_ingredients').delete().eq('id', ingredientId);

    if (error) {
      console.error('❌ Error deleting ingredient:', error);
      throw error;
    }

    logger.debug('✅ Ingredient deleted successfully');
    return true;
  } catch (error) {
    logger.error('❌ Ingredient delete error:', error);
    return false;
  }
}

/**
 * Save a recipe to user's saved recipes
 */
export async function saveRecipe(userId: string, recipeId: string): Promise<UserSavedRecipe | null> {
  try {
    const { data, error} = await supabase
      .from('user_saved_recipes')
      .insert({ user_id: userId, recipe_id: recipeId })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving recipe:', error);
      throw error;
    }

    logger.debug('✅ Recipe saved successfully');
    return data;
  } catch (error) {
    logger.error('❌ Save recipe error:', error);
    return null;
  }
}

/**
 * Unsave a recipe from user's saved recipes
 */
export async function unsaveRecipe(userId: string, recipeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_saved_recipes')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);

    if (error) {
      console.error('❌ Error unsaving recipe:', error);
      throw error;
    }

    logger.debug('✅ Recipe unsaved successfully');
    return true;
  } catch (error) {
    logger.error('❌ Unsave recipe error:', error);
    return false;
  }
}

/**
 * Check if a recipe is saved by the user
 */
export async function isRecipeSaved(userId: string, recipeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_saved_recipes')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', recipeId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error checking if recipe is saved:', error);
      throw error;
    }

    return !!data;
  } catch (error) {
    logger.error('❌ Is recipe saved check error:', error);
    return false;
  }
}

/**
 * Get user's saved recipes
 */
export async function getSavedRecipes(userId: string): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from('user_saved_recipes')
      .select(
        `
        recipe_id,
        recipes (*)
      `
      )
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching saved recipes:', error);
      throw error;
    }

    // Extract recipes from the join result
    // Supabase returns a single recipe object (not array) when using foreign key relationship
    // TypeScript inference handles the mapping without explicit typing
    return data?.map((item) => {
      // Cast to handle Supabase's type inference (via unknown to avoid type errors)
      const typedItem = item as unknown as { recipe_id: string; recipes: Recipe | null };
      return typedItem.recipes;
    }).filter((recipe): recipe is Recipe => recipe !== null) || [];
  } catch (error) {
    logger.error('❌ Saved recipes fetch error:', error);
    return [];
  }
}

/**
 * Check if recipe's Instacart URL needs refreshing (expires within 24 hours)
 */
export function needsInstacartUrlRefresh(recipe: Recipe): boolean {
  if (!recipe.instacart_recipe_url || !recipe.url_expires_at) {
    return true;
  }

  const expiresAt = new Date(recipe.url_expires_at);
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return expiresAt <= oneDayFromNow;
}

/**
 * Import a recipe from TheMealDB
 */
export async function importFromTheMealDB(
  userId: string,
  themealdbRecipe: SimplifiedRecipe
): Promise<Recipe | null> {
  try {
    // Check if already imported
    const { data: existing } = await supabase
      .from('recipes')
      .select('id')
      .eq('user_id', userId)
      .eq('external_id', themealdbRecipe.id)
      .eq('external_source', 'themealdb')
      .maybeSingle();

    if (existing) {
      throw new Error('Recipe already imported');
    }

    // Create recipe
    const recipe = await createRecipe({
      user_id: userId,
      title: themealdbRecipe.title,
      author: `TheMealDB - ${themealdbRecipe.cuisine || 'Unknown'}`,
      description: themealdbRecipe.description,
      prep_time_minutes: themealdbRecipe.prepTime,
      cooking_time_minutes: themealdbRecipe.cookTime,
      servings: themealdbRecipe.servings || 4,
      image_url: themealdbRecipe.imageUrl,
      instructions: themealdbRecipe.instructions,
      external_id: themealdbRecipe.id,
      external_source: 'themealdb',
    });

    if (!recipe) {
      throw new Error('Failed to create recipe');
    }

    // Parse and add ingredients
    const ingredients = themealdbRecipe.ingredients.map((ing, index) => {
      let quantity = ing.quantity;
      let unit = ing.unit;

      // Try to parse if missing quantity or unit
      if (!quantity || !unit) {
        const displayText = `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim();
        const parsed = IngredientParser.parse(displayText);
        if (parsed.quantity && parsed.unit) {
          quantity = parsed.quantity;
          unit = parsed.unit;
        } else if (!unit) {
          // Smart detect unit based on ingredient name
          unit = IngredientParser.smartDetectUnit(ing.name, ing.category);
        }
        if (!quantity) {
          quantity = IngredientParser.guessQuantity(ing.name);
        }
      }

      return {
        recipe_id: recipe.id,
        name: ing.name,
        display_text: `${quantity || ''} ${unit || ''} ${ing.name}`.trim(),
        quantity: quantity,
        unit: unit,
        category: ing.category,
        display_order: index,
        is_pantry_item: ing.category === 'pantry',
      };
    });

    await addIngredients(ingredients);

    logger.debug('✅ Recipe imported from TheMealDB successfully');
    return recipe;
  } catch (error) {
    logger.error('❌ Import from TheMealDB error:', error);
    return null;
  }
}

/**
 * Parse ingredient text into quantity, unit, and name
 */
export function parseIngredientText(text: string): {
  quantity: number | null;
  unit: string | null;
  name: string;
} {
  const parsed = IngredientParser.parse(text);
  return {
    quantity: parsed.quantity,
    unit: parsed.unit,
    name: parsed.ingredient,
  };
}
