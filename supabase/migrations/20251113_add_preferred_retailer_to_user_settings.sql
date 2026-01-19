-- Add preferred_retailer + updated_at to user_settings if they don't exist yet
-- Only add columns if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_settings'
  ) THEN
    ALTER TABLE public.user_settings
      ADD COLUMN IF NOT EXISTS preferred_retailer text;

    ALTER TABLE public.user_settings
      ADD COLUMN IF NOT EXISTS updated_at timestamptz
      DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;
END $$;
