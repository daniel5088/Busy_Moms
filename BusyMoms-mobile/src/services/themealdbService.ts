import type { SimplifiedRecipe } from './recipeService';

const THEMEALDB_API_BASE = 'https://www.themealdb.com/api/json/v1/1';

interface TheMealDBRecipe {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  [key: string]: string | null;
}

interface TheMealDBResponse {
  meals: TheMealDBRecipe[] | null;
}

/**
 * Parse TheMealDB recipe to our simplified format
 */
function parseTheMealDBRecipe(meal: TheMealDBRecipe): SimplifiedRecipe {
  const ingredients: SimplifiedRecipe['ingredients'] = [];

  // TheMealDB has ingredients as strIngredient1-20 and strMeasure1-20
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingredient && ingredient.trim()) {
      const ingredientName = ingredient.trim();
      // Parse measure (e.g., "2 cups", "1 tbsp")
      const measureText = measure?.trim() || '';
      const parts = measureText.split(' ');
      let quantity: number | undefined;
      let unit: string | undefined;

      if (parts.length >= 2 && parts[0]) {
        const potentialQty = parseFloat(parts[0]);
        if (!isNaN(potentialQty)) {
          quantity = potentialQty;
          unit = parts.slice(1).join(' ');
        }
      }

      ingredients.push({
        name: ingredientName,
        quantity,
        unit,
        category: categorizeIngredient(ingredientName),
      });
    }
  }

  // Parse instructions into steps
  const instructions = meal.strInstructions
    ?.split(/\r?\n/)
    .map((step) => step.trim())
    .filter((step) => step.length > 0) || [];

  return {
    id: meal.idMeal,
    title: meal.strMeal,
    description: `${meal.strArea} ${meal.strCategory} dish`,
    cuisine: meal.strArea,
    cookTime: undefined, // TheMealDB doesn't provide this
    prepTime: undefined,
    servings: 4, // Default serving size
    imageUrl: meal.strMealThumb,
    instructions,
    ingredients,
  };
}

/**
 * Categorize ingredient based on name
 */
function categorizeIngredient(name: string | undefined): string {
  if (!name) return 'other';
  const lowerName = name.toLowerCase();

  // Produce
  if (
    /tomato|onion|potato|carrot|pepper|garlic|lettuce|cucumber|celery|broccoli|spinach/.test(
      lowerName
    )
  ) {
    return 'produce';
  }

  // Meat
  if (/chicken|beef|pork|turkey|lamb|fish|salmon|bacon|sausage/.test(lowerName)) {
    return 'meat';
  }

  // Dairy
  if (/milk|cheese|butter|cream|yogurt/.test(lowerName)) {
    return 'dairy';
  }

  // Pantry
  if (/flour|sugar|salt|pepper|oil|rice|pasta|spice|herb/.test(lowerName)) {
    return 'pantry';
  }

  return 'other';
}

/**
 * Search recipes by name
 */
export async function searchByName(query: string): Promise<SimplifiedRecipe[]> {
  try {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const response = await fetch(`${THEMEALDB_API_BASE}/search.php?s=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error('TheMealDB API request failed');
    }

    const data: TheMealDBResponse = await response.json();

    if (!data.meals) {
      return [];
    }

    return data.meals.map(parseTheMealDBRecipe);
  } catch (error) {
    console.error('❌ TheMealDB search error:', error);
    return [];
  }
}

/**
 * Get a random recipe
 */
export async function getRandomRecipe(): Promise<SimplifiedRecipe | null> {
  try {
    const response = await fetch(`${THEMEALDB_API_BASE}/random.php`);

    if (!response.ok) {
      throw new Error('TheMealDB API request failed');
    }

    const data: TheMealDBResponse = await response.json();

    if (!data.meals || data.meals.length === 0 || !data.meals[0]) {
      return null;
    }

    return parseTheMealDBRecipe(data.meals[0]);
  } catch (error) {
    console.error('❌ TheMealDB random recipe error:', error);
    return null;
  }
}

/**
 * Get recipe categories
 */
export async function getCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${THEMEALDB_API_BASE}/categories.php`);

    if (!response.ok) {
      throw new Error('TheMealDB API request failed');
    }

    const data = await response.json();

    if (!data.categories) {
      return [];
    }

    return data.categories.map((cat: { strCategory: string }) => cat.strCategory);
  } catch (error) {
    console.error('❌ TheMealDB categories error:', error);
    return [];
  }
}

/**
 * Filter recipes by category
 */
export async function filterByCategory(category: string): Promise<SimplifiedRecipe[]> {
  try {
    const response = await fetch(
      `${THEMEALDB_API_BASE}/filter.php?c=${encodeURIComponent(category)}`
    );

    if (!response.ok) {
      throw new Error('TheMealDB API request failed');
    }

    const data: TheMealDBResponse = await response.json();

    if (!data.meals) {
      return [];
    }

    // Filter endpoint returns limited data, fetch full details for each
    const detailedRecipes = await Promise.all(
      data.meals.slice(0, 20).map(async (meal) => {
        const detailResponse = await fetch(`${THEMEALDB_API_BASE}/lookup.php?i=${meal.idMeal}`);
        const detailData: TheMealDBResponse = await detailResponse.json();
        if (detailData.meals && detailData.meals.length > 0 && detailData.meals[0]) {
          return parseTheMealDBRecipe(detailData.meals[0]);
        }
        return null;
      })
    );

    return detailedRecipes.filter((recipe): recipe is SimplifiedRecipe => recipe !== null);
  } catch (error) {
    console.error('❌ TheMealDB filter by category error:', error);
    return [];
  }
}

/**
 * Get multiple random recipes
 */
export async function getRandomRecipes(count: number = 10): Promise<SimplifiedRecipe[]> {
  try {
    const recipes = await Promise.all(
      Array.from({ length: Math.min(count, 20) }, () => getRandomRecipe())
    );

    return recipes.filter((recipe): recipe is SimplifiedRecipe => recipe !== null);
  } catch (error) {
    console.error('❌ TheMealDB random recipes error:', error);
    return [];
  }
}
