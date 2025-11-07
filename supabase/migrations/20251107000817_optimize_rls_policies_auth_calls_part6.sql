/*
  # Optimize RLS Policies - Part 6: Recipes and Related Tables

  1. Purpose
    - Optimize RLS policies for recipes, recipe_ingredients, user_saved_recipes tables
*/

-- recipes table policies
DROP POLICY IF EXISTS "Users can view their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON recipes;

CREATE POLICY "Users can view their own recipes"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own recipes"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own recipes"
  ON recipes
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own recipes"
  ON recipes
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- recipe_ingredients table policies
DROP POLICY IF EXISTS "Users can view ingredients for their recipes" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert ingredients for their recipes" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can update ingredients for their recipes" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete ingredients for their recipes" ON recipe_ingredients;

CREATE POLICY "Users can view ingredients for their recipes"
  ON recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert ingredients for their recipes"
  ON recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update ingredients for their recipes"
  ON recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete ingredients for their recipes"
  ON recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = (select auth.uid())
    )
  );

-- user_saved_recipes table policies
DROP POLICY IF EXISTS "Users can view their saved recipes" ON user_saved_recipes;
DROP POLICY IF EXISTS "Users can save recipes" ON user_saved_recipes;
DROP POLICY IF EXISTS "Users can unsave recipes" ON user_saved_recipes;

CREATE POLICY "Users can view their saved recipes"
  ON user_saved_recipes
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can save recipes"
  ON user_saved_recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can unsave recipes"
  ON user_saved_recipes
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));