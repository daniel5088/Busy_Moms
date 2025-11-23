/*
  # Revert Gift Matrix to Original Structure

  1. Changes
    - Drop the affiliate link matrix structure created in previous migrations
    - Restore original gift_matrix table with individual gift item structure
    - Keep user_gift_searches table intact (was not altered)

  2. Original Structure
    - `gift_matrix` table with columns for individual gift items:
      - gift_name, description, category
      - age ranges (min_age, max_age)
      - gender targeting
      - pricing information (min_price, max_price, typical_price)
      - rating, popularity, images, affiliate links
      - retailer, tags, seasonal flags
      - tracking fields (click_count, timestamps)

  3. Security
    - Enable RLS
    - Authenticated users can view active gifts
    - Authenticated users can update click tracking

  4. Performance
    - Indexes on frequently queried columns
    - Composite indexes for search optimization
*/

-- Drop the affiliate link matrix structure
DROP TABLE IF EXISTS gift_matrix CASCADE;

-- Recreate original gift_matrix table structure
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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gift_matrix_active ON gift_matrix(active);
CREATE INDEX IF NOT EXISTS idx_gift_matrix_age_gender ON gift_matrix(min_age, max_age, gender) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_gift_matrix_price ON gift_matrix(min_price, max_price) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_gift_matrix_category ON gift_matrix(category) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_gift_matrix_popularity ON gift_matrix(popularity_score DESC) WHERE active = true;

-- Enable RLS
ALTER TABLE gift_matrix ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view active gifts"
  ON gift_matrix FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Authenticated users can update click counts"
  ON gift_matrix FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_gift_matrix_updated_at
  BEFORE UPDATE ON gift_matrix
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();