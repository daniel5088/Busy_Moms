import { MeasurementConverter } from '../../utils/measurementConverter';

describe('MeasurementConverter', () => {
  describe('volume conversions', () => {
    it('should convert cups to milliliters', () => {
      const result = MeasurementConverter.convert(1, 'cup', 'ml');
      expect(result.quantity).toBeCloseTo(236.59, 1);
      expect(result.unit).toBe('milliliter');
      expect(result.conversionApplied).toBe(true);
    });

    it('should convert tablespoons to teaspoons', () => {
      const result = MeasurementConverter.convert(1, 'tablespoon', 'teaspoon');
      expect(result.quantity).toBeCloseTo(3, 1);
      expect(result.unit).toBe('teaspoon');
    });

    it('should convert liters to cups', () => {
      const result = MeasurementConverter.convert(1, 'liter', 'cup');
      expect(result.quantity).toBeCloseTo(4.23, 1);
      expect(result.unit).toBe('cup');
    });

    it('should handle gallon to liter conversion', () => {
      const result = MeasurementConverter.convert(1, 'gallon', 'liter');
      expect(result.quantity).toBeCloseTo(3.785, 1);
      expect(result.unit).toBe('liter');
    });

    it('should convert fluid ounces to milliliters', () => {
      const result = MeasurementConverter.convert(8, 'fl oz', 'ml');
      expect(result.quantity).toBeGreaterThan(200);
      expect(result.unit).toBe('milliliter');
    });
  });

  describe('weight conversions', () => {
    it('should convert pounds to grams', () => {
      const result = MeasurementConverter.convert(1, 'pound', 'gram');
      expect(result.quantity).toBeCloseTo(453.6, 1);
      expect(result.unit).toBe('gram');
      expect(result.conversionApplied).toBe(true);
    });

    it('should convert kilograms to pounds', () => {
      const result = MeasurementConverter.convert(1, 'kilogram', 'pound');
      expect(result.quantity).toBeCloseTo(2.205, 1);
      expect(result.unit).toBe('pound');
    });

    it('should convert ounces to grams', () => {
      const result = MeasurementConverter.convert(1, 'ounce', 'gram');
      expect(result.quantity).toBeCloseTo(28.35, 1);
      expect(result.unit).toBe('gram');
    });

    it('should convert grams to kilograms', () => {
      const result = MeasurementConverter.convert(1000, 'gram', 'kilogram');
      expect(result.quantity).toBeCloseTo(1, 0);
      expect(result.unit).toBe('kilogram');
    });

    it('should convert milligrams to grams', () => {
      const result = MeasurementConverter.convert(1000, 'milligram', 'gram');
      expect(result.quantity).toBeCloseTo(1, 0);
      expect(result.unit).toBe('gram');
    });
  });

  describe('unit aliases', () => {
    it('should handle "c" as cup', () => {
      const result = MeasurementConverter.convert(1, 'c', 'ml');
      expect(result.quantity).toBeCloseTo(236.59, 1);
      expect(result.unit).toBe('milliliter');
    });

    it('should handle "tbsp" as tablespoon', () => {
      const result = MeasurementConverter.convert(1, 'tbsp', 'tsp');
      expect(result.quantity).toBeCloseTo(3, 1);
    });

    it('should handle "lb" as pound', () => {
      const result = MeasurementConverter.convert(1, 'lb', 'g');
      expect(result.quantity).toBeCloseTo(453.6, 1);
    });

    it('should handle "oz" as ounce', () => {
      const result = MeasurementConverter.convert(1, 'oz', 'g');
      expect(result.quantity).toBeCloseTo(28.35, 1);
    });
  });

  describe('same unit conversion', () => {
    it('should not convert when units are the same', () => {
      const result = MeasurementConverter.convert(5, 'cup', 'cup');
      expect(result.quantity).toBe(5);
      expect(result.unit).toBe('cup');
      expect(result.conversionApplied).toBe(false);
    });

    it('should handle alias to canonical form', () => {
      const result = MeasurementConverter.convert(2, 'cups', 'cup');
      expect(result.quantity).toBe(2);
    });
  });

  describe('incompatible unit conversion', () => {
    it('should not convert between volume and weight', () => {
      const result = MeasurementConverter.convert(1, 'cup', 'gram');
      expect(result.conversionApplied).toBe(false);
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('cup');
      expect(result.confidence).toBeLessThan(1);
    });

    it('should not convert count units to volume', () => {
      const result = MeasurementConverter.convert(5, 'each', 'cup');
      expect(result.conversionApplied).toBe(false);
      expect(result.quantity).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle zero quantity', () => {
      const result = MeasurementConverter.convert(0, 'cup', 'ml');
      expect(result.quantity).toBe(0);
      expect(result.conversionApplied).toBe(true);
    });

    it('should handle negative numbers', () => {
      const result = MeasurementConverter.convert(-1, 'cup', 'ml');
      expect(result.quantity).toBeLessThan(0);
    });

    it('should handle very large numbers', () => {
      const result = MeasurementConverter.convert(1000000, 'ml', 'liter');
      expect(result.quantity).toBe(1000);
      expect(result.unit).toBe('liter');
    });

    it('should handle decimal quantities', () => {
      const result = MeasurementConverter.convert(0.5, 'cup', 'ml');
      expect(result.quantity).toBeCloseTo(118.29, 1);
    });

    it('should handle very small quantities', () => {
      const result = MeasurementConverter.convert(0.001, 'gram', 'milligram');
      expect(result.quantity).toBeCloseTo(1, 1);
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase units', () => {
      const result = MeasurementConverter.convert(1, 'CUP', 'ML');
      expect(result.conversionApplied).toBe(true);
    });

    it('should handle mixed case', () => {
      const result = MeasurementConverter.convert(1, 'Cup', 'Ml');
      expect(result.conversionApplied).toBe(true);
    });
  });

  describe('unknown units', () => {
    it('should handle unknown source unit', () => {
      const result = MeasurementConverter.convert(1, 'unknownUnit', 'cup');
      expect(result.conversionApplied).toBe(false);
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('unknownUnit');
    });

    it('should handle unknown target unit', () => {
      const result = MeasurementConverter.convert(1, 'cup', 'unknownUnit');
      expect(result.conversionApplied).toBe(false);
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('cup');
    });
  });
});
