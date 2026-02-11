import { IngredientParser } from '../../utils/ingredientParser';

describe('IngredientParser', () => {
  describe('parse', () => {
    it('should parse simple ingredient with quantity and unit', () => {
      const result = IngredientParser.parse('2 cups flour');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cups');
      expect(result.ingredient).toContain('flour');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should parse ingredient with fraction', () => {
      const result = IngredientParser.parse('1/2 cup sugar');
      expect(result.quantity).toBeCloseTo(0.5);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toContain('sugar');
    });

    it('should parse ingredient with Unicode fraction', () => {
      const result = IngredientParser.parse('¼ teaspoon salt');
      expect(result.quantity).toBeCloseTo(0.25);
      expect(result.unit).toBe('teaspoon');
      expect(result.ingredient).toContain('salt');
    });

    it('should parse ingredient with mixed number', () => {
      const result = IngredientParser.parse('2 1/2 tablespoons butter');
      expect(result.quantity).toBeCloseTo(2.5);
      expect(result.unit).toBe('tablespoons');
      expect(result.ingredient).toContain('butter');
    });

    it('should parse ingredient with range', () => {
      const result = IngredientParser.parse('2-3 cups water');
      expect(result.isRange).toBe(true);
      expect(result.minQuantity).toBe(2);
      expect(result.maxQuantity).toBe(3);
    });

    it('should parse ingredient without unit', () => {
      const result = IngredientParser.parse('3 eggs');
      expect(result.quantity).toBe(3);
      expect(result.ingredient).toContain('eggs');
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should parse ingredient without quantity', () => {
      const result = IngredientParser.parse('salt to taste');
      expect(result.quantity).toBeNull();
      expect(result.ingredient).toContain('salt');
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should handle ingredient with "of" preposition', () => {
      const result = IngredientParser.parse('1 cup of milk');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toContain('milk');
      expect(result.ingredient).not.toContain('of');
    });

    it('should handle weight units', () => {
      const result = IngredientParser.parse('500 grams chicken');
      expect(result.quantity).toBe(500);
      expect(result.unit).toMatch(/gram/i);
      expect(result.ingredient).toContain('chicken');
    });

    it('should handle pounds and ounces', () => {
      const result = IngredientParser.parse('2 lbs beef');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('lbs');
      expect(result.ingredient).toContain('beef');
    });

    it('should preserve original text', () => {
      const originalText = '  2 cups flour  ';
      const result = IngredientParser.parse(originalText);
      expect(result.originalText).toBe('2 cups flour');
    });

    it('should handle complex ingredient names', () => {
      const result = IngredientParser.parse('1 cup all-purpose flour, sifted');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toContain('all-purpose flour');
    });

    it('should handle decimal quantities', () => {
      const result = IngredientParser.parse('0.5 cup milk');
      expect(result.quantity).toBe(0.5);
      expect(result.unit).toBe('cup');
    });

    it('should handle "to" in range', () => {
      const result = IngredientParser.parse('1 to 2 teaspoons vanilla');
      expect(result.isRange).toBe(true);
      expect(result.minQuantity).toBe(1);
      expect(result.maxQuantity).toBe(2);
    });

    it('should handle empty string', () => {
      const result = IngredientParser.parse('');
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.originalText).toBe('');
    });

    it('should handle text with no recognizable units', () => {
      const result = IngredientParser.parse('a pinch of nutmeg');
      expect(result.ingredient).toBeTruthy();
      expect(result.confidence).toBeLessThan(1.0);
    });
  });
});
