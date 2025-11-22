/*
  # Create Gift Matrix Tables

  1. New Tables
    - `gift_matrix` - Stores predefined gift ideas searchable by age, gender, and budget
    - `user_gift_searches` - Stores user's gift search history

  2. Security
    - Enable RLS on both tables
    - gift_matrix: Read-only access for authenticated users
    - user_gift_searches: Users can manage their own searches

  3. Performance
    - Indexes on frequently queried columns
*/

-- Gift Matrix Table
CREATE TABLE IF NOT EXISTS gift_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('toys', 'books', 'clothing', 'electronics', 'sports', 'arts_crafts', 'educational', 'games', 'experiences', 'gift_cards')),
  min_age integer NOT NULL CHECK (min_age >= 0 AND min_age <= 25),
  max_age integer NOT NULL CHECK (max_age >= 0 AND max_age <= 25 AND max_age >= min_age),
  gender text NOT NULL CHECK (gender IN ('Boy', 'Girl', 'Unisex')),
  min_price numeric(10,2) NOT NULL CHECK (min_price >= 0),
  max_price numeric(10,2) NOT NULL CHECK (max_price >= min_price),
  typical_price numeric(10,2) NOT NULL,
  rating numeric(3,2) CHECK (rating >= 0 AND rating <= 5),
  popularity_score integer DEFAULT 0,
  image_url text,
  affiliate_url text NOT NULL,
  retailer text NOT NULL,
  tags text[] DEFAULT '{}',
  seasonal boolean DEFAULT false,
  season text CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'holiday')),
  active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  last_clicked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_matrix_active ON gift_matrix(active);
CREATE INDEX IF NOT EXISTS idx_gift_matrix_age_gender ON gift_matrix(min_age, max_age, gender) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_gift_matrix_price ON gift_matrix(min_price, max_price) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_gift_matrix_category ON gift_matrix(category) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_gift_matrix_popularity ON gift_matrix(popularity_score DESC) WHERE active = true;

ALTER TABLE gift_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active gifts"
  ON gift_matrix FOR SELECT TO authenticated
  USING (active = true);

CREATE TRIGGER update_gift_matrix_updated_at
  BEFORE UPDATE ON gift_matrix
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- User Gift Searches Table
CREATE TABLE IF NOT EXISTS user_gift_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  recipient_age integer NOT NULL CHECK (recipient_age >= 0 AND recipient_age <= 25),
  recipient_gender text NOT NULL CHECK (recipient_gender IN ('Boy', 'Girl', 'Other')),
  budget_min numeric(10,2) NOT NULL CHECK (budget_min >= 0),
  budget_max numeric(10,2) NOT NULL CHECK (budget_max >= budget_min),
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  matching_gift_ids uuid[] DEFAULT '{}',
  result_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_gift_searches_user ON user_gift_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gift_searches_created ON user_gift_searches(created_at DESC);

ALTER TABLE user_gift_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gift searches"
  ON user_gift_searches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gift searches"
  ON user_gift_searches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gift searches"
  ON user_gift_searches FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
