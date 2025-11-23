/*
  # Reseed Gift Matrix with Original Data

  Populates gift_matrix with diverse gift ideas across all age ranges, genders, and price points.
  This restores the original seed data that matches the frontend expectations.
*/

INSERT INTO gift_matrix (gift_name, description, category, min_age, max_age, gender, min_price, max_price, typical_price, rating, affiliate_url, retailer, tags) VALUES

-- Toys
('LEGO Classic Creative Bricks', '900-piece LEGO set for creative building', 'toys', 5, 12, 'Unisex', 40.00, 60.00, 49.99, 4.8, 'https://www.amazon.com/dp/B01J41D8I8', 'Amazon', ARRAY['building', 'creative']),
('Baby Einstein Musical Toy', 'Musical toy with classical melodies', 'toys', 0, 2, 'Unisex', 8.00, 15.00, 9.99, 4.7, 'https://www.amazon.com/dp/B000YDDF6O', 'Amazon', ARRAY['music', 'baby']),
('Barbie Dreamhouse', 'Multi-story dollhouse with furniture', 'toys', 3, 8, 'Girl', 150.00, 200.00, 179.99, 4.6, 'https://www.amazon.com/dp/B01MFBYBQN', 'Amazon', ARRAY['dolls']),
('Hot Wheels Track Set', 'Stunt track with loop and launcher', 'toys', 5, 10, 'Boy', 25.00, 40.00, 29.99, 4.5, 'https://www.amazon.com/dp/B07HRLZFNQ', 'Amazon', ARRAY['cars', 'action']),
('Wooden Building Blocks', '100-piece wooden block set', 'toys', 2, 6, 'Unisex', 20.00, 30.00, 24.99, 4.9, 'https://www.amazon.com/dp/B00005RF5C', 'Amazon', ARRAY['building', 'classic']),

-- Books
('The Very Hungry Caterpillar', 'Classic board book by Eric Carle', 'books', 0, 3, 'Unisex', 5.00, 10.00, 7.99, 4.9, 'https://www.amazon.com/dp/0399226907', 'Amazon', ARRAY['board book']),
('Harry Potter Complete Set', 'All 7 books in box set', 'books', 8, 15, 'Unisex', 50.00, 80.00, 65.00, 5.0, 'https://www.amazon.com/dp/B0192CTMYG', 'Amazon', ARRAY['fantasy', 'series']),
('Diary of a Wimpy Kid Set', 'Books 1-14 box set', 'books', 8, 12, 'Unisex', 40.00, 60.00, 49.99, 4.8, 'https://www.amazon.com/dp/B08JQ5PGWM', 'Amazon', ARRAY['humor']),
('Kids Encyclopedia', 'Illustrated encyclopedia', 'books', 8, 14, 'Unisex', 20.00, 35.00, 27.99, 4.7, 'https://www.amazon.com/dp/1426310366', 'Amazon', ARRAY['educational']),

-- Electronics
('Kids Tablet', '8-inch tablet with parental controls', 'electronics', 6, 12, 'Unisex', 100.00, 150.00, 119.99, 4.6, 'https://www.amazon.com/dp/B07WDDT3G5', 'Amazon', ARRAY['tablet']),
('Nintendo Switch Lite', 'Portable gaming console', 'electronics', 8, 18, 'Unisex', 180.00, 220.00, 199.99, 4.7, 'https://www.amazon.com/dp/B092VT1JGD', 'Amazon', ARRAY['gaming']),
('Kids Digital Camera', 'Camera designed for children', 'electronics', 5, 10, 'Unisex', 25.00, 40.00, 32.99, 4.4, 'https://www.amazon.com/dp/B07DVBYKB3', 'Amazon', ARRAY['camera']),
('Kids Headphones', 'Volume-limited headphones', 'electronics', 5, 12, 'Unisex', 15.00, 30.00, 24.99, 4.5, 'https://www.amazon.com/dp/B01F5FVYPE', 'Amazon', ARRAY['audio']),
('Wireless Earbuds', 'Wireless earbuds with case', 'electronics', 13, 25, 'Unisex', 120.00, 160.00, 139.99, 4.8, 'https://www.amazon.com/dp/B07PXGQC1Q', 'Amazon', ARRAY['audio', 'tech']),

-- Sports
('Youth Basketball', 'Official size youth basketball', 'sports', 8, 15, 'Unisex', 15.00, 30.00, 19.99, 4.6, 'https://www.amazon.com/dp/B07F2T5DNK', 'Amazon', ARRAY['ball', 'outdoor']),
('Adjustable Roller Skates', 'Inline skates with safety gear', 'sports', 6, 12, 'Unisex', 40.00, 70.00, 54.99, 4.5, 'https://www.amazon.com/dp/B07K8S7LQB', 'Amazon', ARRAY['skating']),
('Soccer Goal Set', 'Pop-up soccer goals set of 2', 'sports', 5, 12, 'Unisex', 20.00, 40.00, 29.99, 4.4, 'https://www.amazon.com/dp/B00KA81LMY', 'Amazon', ARRAY['soccer']),
('Kids Yoga Mat', 'Non-slip yoga mat', 'sports', 5, 12, 'Unisex', 15.00, 25.00, 19.99, 4.6, 'https://www.amazon.com/dp/B07VL8QCJL', 'Amazon', ARRAY['yoga', 'fitness']),

-- Arts & Crafts
('Crayon Set', '152 crayons in carrying case', 'arts_crafts', 3, 12, 'Unisex', 15.00, 25.00, 19.99, 4.8, 'https://www.amazon.com/dp/B00004YO15', 'Amazon', ARRAY['drawing']),
('Play-Doh Set', '24-pack colorful Play-Doh', 'arts_crafts', 3, 8, 'Unisex', 10.00, 20.00, 14.99, 4.7, 'https://www.amazon.com/dp/B00JM5GW10', 'Amazon', ARRAY['sculpting']),
('DIY Soap Kit', 'Make your own soap craft kit', 'arts_crafts', 8, 14, 'Girl', 15.00, 25.00, 19.99, 4.6, 'https://www.amazon.com/dp/B005WHRNQS', 'Amazon', ARRAY['diy']),
('Art Supply Set', 'Complete art supplies in case', 'arts_crafts', 5, 12, 'Unisex', 20.00, 35.00, 27.99, 4.5, 'https://www.amazon.com/dp/B000P11CKI', 'Amazon', ARRAY['art']),
('Bracelet Making Kit', 'Friendship bracelet kit', 'arts_crafts', 6, 12, 'Girl', 10.00, 20.00, 14.99, 4.6, 'https://www.amazon.com/dp/B001TIVWLE', 'Amazon', ARRAY['jewelry']),

-- Educational
('Learning Words Book', '100 words interactive book', 'educational', 2, 5, 'Unisex', 15.00, 25.00, 19.99, 4.7, 'https://www.amazon.com/dp/B01CGQHXLG', 'Amazon', ARRAY['learning']),
('STEM Learning Kit', 'Interactive learning games', 'educational', 6, 10, 'Unisex', 80.00, 120.00, 99.99, 4.6, 'https://www.amazon.com/dp/B016OHFDZM', 'Amazon', ARRAY['stem']),
('Kids Microscope', 'Microscope with slides', 'educational', 6, 12, 'Unisex', 25.00, 40.00, 32.99, 4.5, 'https://www.amazon.com/dp/B00B1Z3R1C', 'Amazon', ARRAY['science']),
('Illuminated Globe', 'World globe for kids', 'educational', 6, 14, 'Unisex', 20.00, 40.00, 29.99, 4.6, 'https://www.amazon.com/dp/B01MYSB32V', 'Amazon', ARRAY['geography']),
('Periodic Table Poster', 'Educational science poster', 'educational', 10, 18, 'Unisex', 8.00, 15.00, 9.99, 4.7, 'https://www.amazon.com/dp/B07MDHF8BH', 'Amazon', ARRAY['science']),

-- Games
('Monopoly Classic', 'Classic family board game', 'games', 8, 16, 'Unisex', 15.00, 30.00, 19.99, 4.6, 'https://www.amazon.com/dp/B00CV5PN2W', 'Amazon', ARRAY['board game']),
('Jenga', 'Wooden stacking block game', 'games', 6, 18, 'Unisex', 10.00, 20.00, 14.99, 4.8, 'https://www.amazon.com/dp/B00ABA0ZOA', 'Amazon', ARRAY['party']),
('UNO Card Game', 'Classic family card game', 'games', 7, 18, 'Unisex', 5.00, 10.00, 5.99, 4.8, 'https://www.amazon.com/dp/B00004TZY8', 'Amazon', ARRAY['card game']),
('Chess Set', 'Complete chess set with board', 'games', 8, 18, 'Unisex', 15.00, 40.00, 24.99, 4.7, 'https://www.amazon.com/dp/B07D7FRLQ7', 'Amazon', ARRAY['strategy']),
('Ticket to Ride', 'Train adventure board game', 'games', 8, 18, 'Unisex', 30.00, 50.00, 39.99, 4.8, 'https://www.amazon.com/dp/B0041O43ZA', 'Amazon', ARRAY['board game']),

-- Clothing
('Baby Onesie Set', 'Pack of 5 baby onesies', 'clothing', 0, 1, 'Unisex', 15.00, 25.00, 19.99, 4.7, 'https://www.amazon.com/dp/B073GKL2YY', 'Amazon', ARRAY['baby']),
('Kids Athletic Shoes', 'Running shoes for kids', 'clothing', 5, 12, 'Unisex', 40.00, 70.00, 54.99, 4.6, 'https://www.amazon.com/dp/B07W4NG8JK', 'Amazon', ARRAY['shoes']),
('Princess Dress Set', 'Costume with accessories', 'clothing', 3, 8, 'Girl', 20.00, 35.00, 27.99, 4.5, 'https://www.amazon.com/dp/B07XLWJK3N', 'Amazon', ARRAY['costume']),
('Superhero Cape', 'Cape with matching mask', 'clothing', 3, 8, 'Boy', 10.00, 20.00, 14.99, 4.6, 'https://www.amazon.com/dp/B01N6E0W5I', 'Amazon', ARRAY['costume']),

-- Experiences
('Museum Membership', 'Annual family museum pass', 'experiences', 5, 18, 'Unisex', 75.00, 150.00, 99.99, 4.8, 'https://www.museumgiftshop.com', 'Various', ARRAY['educational']),
('Trampoline Park Pass', 'Multi-visit trampoline pass', 'experiences', 6, 16, 'Unisex', 40.00, 80.00, 59.99, 4.7, 'https://www.skyzone.com/gift', 'Sky Zone', ARRAY['active']),
('Art Class Package', '4-week art class', 'experiences', 6, 14, 'Unisex', 80.00, 150.00, 99.99, 4.6, 'https://www.artclass.com', 'Various', ARRAY['creative']),

-- Gift Cards
('Amazon Gift Card', 'Digital gift card', 'gift_cards', 10, 25, 'Unisex', 10.00, 500.00, 25.00, 5.0, 'https://www.amazon.com/gift-cards', 'Amazon', ARRAY['flexible']),
('Roblox Gift Card', 'Robux for gaming', 'gift_cards', 8, 16, 'Unisex', 10.00, 100.00, 25.00, 4.8, 'https://www.roblox.com/gift', 'Roblox', ARRAY['gaming']),
('iTunes Gift Card', 'For music and apps', 'gift_cards', 10, 25, 'Unisex', 15.00, 200.00, 25.00, 4.7, 'https://www.apple.com/shop/gift-cards', 'Apple', ARRAY['music']),
('Target Gift Card', 'Target store gift card', 'gift_cards', 10, 25, 'Unisex', 10.00, 500.00, 25.00, 4.8, 'https://www.target.com/gift-cards', 'Target', ARRAY['shopping']);