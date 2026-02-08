# Agent Session 6 -- Phase 6: Shopping, Recipes, and Instacart

## Context from Previous Sessions
- Phases 1-4 complete: Foundation, UI, Auth, Dashboard
- Phase 5 may or may not be complete (this phase is independent of Phase 5)

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 6 section
2. `REBUILD_PROGRESS.md` and most recent PHASE_*_HANDOFF.md
3. `Busy_Moms/src/components/Shopping.tsx` -- web shopping component
4. `Busy_Moms/src/components/forms/ShoppingForm.tsx` -- web shopping form
5. `Busy_Moms/src/components/RecipeBrowser.tsx` -- web recipe browser
6. `Busy_Moms/src/components/RecipeDetailModal.tsx` -- web recipe detail
7. `Busy_Moms/src/components/InstacartButton.tsx` -- web Instacart button
8. `Busy_Moms/src/components/RetailerSelectionModal.tsx`
9. `Busy_Moms/src/services/recipeService.ts`
10. `Busy_Moms/src/services/instacartService.ts`
11. `Busy_Moms/src/services/instacartShoppingService.ts`
12. `Busy_Moms/src/utils/measurementConverter.ts`
13. `Busy_Moms/src/utils/ingredientParser.ts`
14. `Busy_Moms/src/utils/instacartUnitMapper.ts`
15. `Busy_Moms/RECIPE_FEATURE_GUIDE.md`
16. `Busy_Moms/MEASUREMENT_CONVERSION_GUIDE.md`

## Your Mission
Build the complete shopping experience: shopping list with categories, recipe browser with search/filters, recipe detail with servings adjuster, Instacart integration, retailer selection, and measurement conversion.

## Prerequisites Check
- [ ] Phases 1-4 completed
- [ ] UI components available
- [ ] AuthContext provides user

## Implementation Steps

### Step 1: Build shopping service
**src/services/shoppingService.ts**
- getShoppingItems(userId) -- fetch all items
- addShoppingItem(item)
- updateShoppingItem(id, data)
- deleteShoppingItem(id)
- toggleComplete(id)
- bulkDelete(ids)
- getCategories() -- return distinct categories

### Step 2: Build shopping list components
**src/components/shopping/ShoppingList.tsx**
- SectionList grouped by category
- Each item: name, quantity, unit, checkbox to complete
- Swipe-to-delete (react-native-gesture-handler)
- Completed items section (collapsed)

**src/components/shopping/ShoppingForm.tsx**
- Item name input
- Quantity and unit inputs (MeasurementInput)
- Category selector
- Notes field
- Urgent toggle
- "Add Item" button

**src/components/shopping/CategorySection.tsx**
- Section header with category name and count
- Collapsible

### Step 3: Build recipe service
**src/services/recipeService.ts**
Port from web:
- getRecipes(filters)
- getRecipeById(id)
- getRecipeIngredients(recipeId)
- saveRecipe(userId, recipeId)
- unsaveRecipe(userId, recipeId)
- getSavedRecipes(userId)
- createRecipe, addIngredients

### Step 4: Build recipe components
**src/components/shopping/RecipeBrowser.tsx**
- Two tabs: "Browse" and "Saved"
- Search input
- Filter chips: cooking time, servings
- Recipe cards with image, title, time, servings
- Save/unsave button (heart icon)

**src/components/shopping/RecipeDetail.tsx**
- Hero image
- Title, author, description
- Servings adjuster (- / + buttons)
- Ingredient list with checkboxes (auto-scales with servings)
- Pantry items section
- Step-by-step instructions
- "Add to Shopping List" button (adds selected ingredients)
- "View on Instacart" button

**app/recipe/[id].tsx**
- Screen wrapper for RecipeDetail

### Step 5: Build Instacart integration
**src/services/instacartService.ts**
Port from web:
- createRecipePage(recipe, ingredients) -- calls instacart-recipes edge function
- createShoppingList(items) -- calls instacart-shopping-list edge function
- getNearbyRetailers(postalCode) -- calls instacart-get-retailers edge function
- Uses `Linking.openURL` to open Instacart URLs

**src/components/shopping/InstacartButton.tsx**
- "Send to Instacart" button
- Shows loading while creating shopping list
- Opens Instacart in browser/app via deep link

**src/components/shopping/RetailerSelector.tsx**
- Modal to select preferred retailer
- Shows nearby retailers based on location
- Saves preference to `user_preferred_retailers` table

**src/hooks/useRetailerSelection.ts**
- Manages selected retailer state
- Loads user's preferred retailer

### Step 6: Build measurement system
**src/utils/measurementConverter.ts** -- port directly from web (pure functions)
**src/utils/ingredientParser.ts** -- port directly from web (pure functions)
**src/utils/instacartUnitMapper.ts** -- port directly from web (pure functions)

**src/services/measurementService.ts**
- Get user measurement preferences
- Convert quantities based on preferences

**src/components/shopping/MeasurementInput.tsx**
- Quantity input + unit dropdown
- Shows conversion preview

### Step 7: Build the Shopping screen
**app/(tabs)/shopping.tsx** (complete rewrite)
- Two tabs: "Shopping List" and "Recipes"
- Shopping List tab: ShoppingList + FAB for adding items
- Recipes tab: RecipeBrowser
- "Send All to Instacart" button when items exist

## Quality Checklist
- [ ] Shopping list displays items grouped by category
- [ ] Add/edit/delete shopping items works
- [ ] Toggle complete works
- [ ] Recipe browser shows recipes with search/filter
- [ ] Recipe detail shows ingredients with servings adjuster
- [ ] "Add to Shopping List" adds selected ingredients
- [ ] Instacart button opens Instacart shopping page
- [ ] Retailer selection works
- [ ] Measurement conversion works (metric/imperial)
- [ ] Works on both iOS and Android

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_6_HANDOFF.md`
3. Git commit

## Next Agent Context
Phase 7 (Tasks/Family) will build similar CRUD patterns. The shopping service pattern should serve as a template.
