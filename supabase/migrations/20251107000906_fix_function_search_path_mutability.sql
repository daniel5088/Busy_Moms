/*
  # Fix Function Search Path Mutability

  1. Purpose
    - Fix mutable search_path security issue in functions
    - Add SECURITY DEFINER and explicit search_path to functions
    - Prevents search_path hijacking attacks

  2. Functions Affected
    - ensure_single_default_address
    - initialize_affirmation_settings
    - update_updated_at_column

  3. Security Impact
    - Prevents malicious schema-based attacks
    - Ensures functions always use correct schema
    - Maintains function behavior while improving security
*/

-- Fix ensure_single_default_address function
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix initialize_affirmation_settings function
CREATE OR REPLACE FUNCTION initialize_affirmation_settings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO affirmation_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;