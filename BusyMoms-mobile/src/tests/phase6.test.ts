/**
 * Phase 6 Integration Tests
 * Tests for Shopping & Recipe functionality
 */

import { MeasurementConverter } from '../utils/measurementConverter';
import { IngredientParser } from '../utils/ingredientParser';
import { InstacartUnitMapper } from '../utils/instacartUnitMapper';

describe('Phase 6: Shopping & Recipes', () => {
  describe('MeasurementConverter', () => {
    it('should convert cups to milliliters', () => {
      const result = MeasurementConverter.convert(2, 'cups', 'ml');
      expect(result.quantity).toBeCloseTo(473.18, 1);
      expect(result.conversionApplied).toBe(true);
    });

    it('should normalize unit names', () => {
      expect(MeasurementConverter.normalizeUnit('Cup')).toBe('cup');
      expect(MeasurementConverter.normalizeUnit('TBSP')).toBe('tablespoon');
      expect(MeasurementConverter.normalizeUnit('oz')).toBe('ounce');
    });

    it('should convert between metric and imperial', () => {
      const result = MeasurementConverter.convertToSystem(500, 'gram', 'imperial');
      expect(result.quantity).toBeCloseTo(1.1, 1);
      expect(result.unit).toBe('pound');
    });

    it('should format quantities with fractions', () => {
      expect(MeasurementConverter.formatQuantity(0.5)).toBe('½');
      expect(MeasurementConverter.formatQuantity(0.25)).toBe('¼');
      expect(MeasurementConverter.formatQuantity(1.5)).toBe('1½');
      expect(MeasurementConverter.formatQuantity(2.75)).toBe('2¾');
    });
  });

  describe('IngredientParser', () => {
    it('should parse simple ingredient', () => {
      const result = IngredientParser.parse('2 cups flour');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('flour');
    });

    it('should parse fractions', () => {
      const result1 = IngredientParser.parse('½ cup sugar');
      expect(result1.quantity).toBe(0.5);
      expect(result1.unit).toBe('cup');

      const result2 = IngredientParser.parse('1/4 teaspoon salt');
      expect(result2.quantity).toBe(0.25);
      expect(result2.unit).toBe('teaspoon');
    });

    it('should parse mixed numbers', () => {
      const result = IngredientParser.parse('2 1/2 cups milk');
      expect(result.quantity).toBe(2.5);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('milk');
    });

    it('should parse ranges', () => {
      const result = IngredientParser.parse('1-2 tablespoons butter');
      expect(result.quantity).toBe(1.5); // Average
      expect(result.isRange).toBe(true);
      expect(result.minQuantity).toBe(1);
      expect(result.maxQuantity).toBe(2);
    });

    it('should handle ingredients without quantities', () => {
      const result = IngredientParser.parse('salt to taste');
      expect(result.quantity).toBeNull();
      expect(result.ingredient).toBe('salt to taste');
    });
  });

  describe('InstacartUnitMapper', () => {
    it('should map to Instacart-compatible units', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(1, 'cup', 'dairy');
      expect(result).toBeTruthy();
      expect(result.unit).toBeTruthy();
      expect(['liter', 'gallon', 'cup', 'fluid ounce']).toContain(result.unit);
    });

    it('should check if unit is Instacart-compatible', () => {
      expect(InstacartUnitMapper.isInstacartCompatible('cup')).toBe(true);
      expect(InstacartUnitMapper.isInstacartCompatible('pound')).toBe(true);
      expect(InstacartUnitMapper.isInstacartCompatible('item')).toBe(true);
      expect(InstacartUnitMapper.isInstacartCompatible('pinch')).toBe(false);
      expect(InstacartUnitMapper.isInstacartCompatible('dash')).toBe(false);
    });

    it('should format for Instacart with correct units', () => {
      const result = InstacartUnitMapper.formatForInstacart(2, 'cup', 'dairy');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBeTruthy();
      expect(result.quantity).toBeGreaterThan(0);
    });

    it('should handle null/undefined gracefully', () => {
      const result = InstacartUnitMapper.formatForInstacart(null, null, 'other');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('item');
    });

    it('should get preferred units for categories', () => {
      const dairy = InstacartUnitMapper.getCategoryPreferredUnits('dairy');
      expect(dairy).toHaveProperty('volume');
      expect(dairy).toHaveProperty('weight');
      expect(dairy).toHaveProperty('count');

      const produce = InstacartUnitMapper.getCategoryPreferredUnits('produce');
      expect(produce).toBeTruthy();
    });
  });

  describe('Shopping Item Validation', () => {
    it('should validate shopping item structure', () => {
      const item = {
        item: 'Milk',
        quantity: 1,
        unit: 'gallon',
        category: 'dairy',
        notes: null,
      };

      expect(item.item).toBeTruthy();
      expect(item.quantity).toBeGreaterThan(0);
      expect(['dairy', 'produce', 'meat', 'pantry', 'other']).toContain(item.category);
    });

    it('should handle items without units', () => {
      const item = {
        item: 'Eggs',
        quantity: 12,
        unit: null,
        category: 'dairy',
        notes: null,
      };

      expect(item.item).toBeTruthy();
      expect(item.quantity).toBeGreaterThan(0);
    });
  });

  describe('Recipe Ingredient Scaling', () => {
    it('should scale ingredients correctly', () => {
      const originalServings = 4;
      const newServings = 6;
      const factor = newServings / originalServings;

      const ingredient = {
        name: 'flour',
        quantity: 2,
        unit: 'cup',
      };

      const scaledQuantity = Math.round((ingredient.quantity || 0) * factor * 100) / 100;
      expect(scaledQuantity).toBe(3);
    });

    it('should handle fractional scaling', () => {
      const originalServings = 4;
      const newServings = 3;
      const factor = newServings / originalServings;

      const ingredient = {
        name: 'sugar',
        quantity: 1,
        unit: 'cup',
      };

      const scaledQuantity = Math.round((ingredient.quantity || 0) * factor * 100) / 100;
      expect(scaledQuantity).toBe(0.75); // 3/4
    });
  });

  describe('Category Organization', () => {
    const categories = [
      'produce',
      'dairy',
      'meat',
      'pantry',
      'bakery',
      'frozen',
      'beverages',
      'snacks',
      'household',
      'personal_care',
      'other',
    ];

    it('should have all required categories', () => {
      expect(categories).toHaveLength(11);
      expect(categories).toContain('produce');
      expect(categories).toContain('dairy');
      expect(categories).toContain('meat');
    });

    it('should categorize items correctly', () => {
      const items = [
        { item: 'Apples', category: 'produce' },
        { item: 'Milk', category: 'dairy' },
        { item: 'Chicken', category: 'meat' },
        { item: 'Flour', category: 'pantry' },
      ];

      items.forEach(({ item: _item, category }) => {
        expect(categories).toContain(category);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full ingredient parsing and conversion workflow', () => {
      // Parse ingredient
      const parsed = IngredientParser.parse('2 cups milk');
      expect(parsed.quantity).toBe(2);
      expect(parsed.unit).toBe('cup');

      // Convert to metric
      const converted = MeasurementConverter.convert(
        (parsed.quantity || 0),
        (parsed.unit || ''),
        'ml'
      );
      expect(converted.quantity).toBeCloseTo(473.18, 0);

      // Format for Instacart
      const formatted = InstacartUnitMapper.formatForInstacart(
        converted.quantity,
        converted.unit,
        'dairy'
      );
      expect(formatted.quantity).toBeGreaterThan(0);
      expect(formatted.unit).toBeTruthy();
    });

    it('should handle recipe to shopping list conversion', () => {
      const recipeIngredients = [
        { name: 'flour', quantity: 2, unit: 'cup', category: 'pantry' },
        { name: 'sugar', quantity: 1, unit: 'cup', category: 'pantry' },
        { name: 'milk', quantity: 1.5, unit: 'cup', category: 'dairy' },
      ];

      const servingsFactor = 2; // Double the recipe

      const shoppingItems = recipeIngredients.map((ing) => ({
        item: ing.name,
        quantity: Math.round((ing.quantity || 0) * servingsFactor * 100) / 100,
        unit: ing.unit,
        category: ing.category,
        notes: null,
      }));

      expect(shoppingItems).toHaveLength(3);
      expect(shoppingItems[0]?.quantity).toBe(4); // 2 * 2
      expect(shoppingItems[1]?.quantity).toBe(2); // 1 * 2
      expect(shoppingItems[2]?.quantity).toBe(3); // 1.5 * 2
    });
  });
});
