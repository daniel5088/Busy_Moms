import { InstacartUnitMapper } from '../../utils/instacartUnitMapper';

describe('InstacartUnitMapper', () => {
  describe('mapToInstacartUnit', () => {
    it('should map dairy volume to fluid ounce', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(1, 'cup', 'dairy');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('fluid ounce');
      expect(result.quantity).toBeGreaterThan(0);
    });

    it('should map produce weight to pound', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(500, 'gram', 'produce');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('pound');
      expect(result.quantity).toBeCloseTo(1.1, 1);
    });

    it('should handle meat category with pounds', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(2, 'pound', 'meat');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('pound');
      expect(result.quantity).toBe(2);
    });

    it('should preserve count units', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(5, 'each', 'produce');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('each');
      expect(result.quantity).toBe(5);
    });

    it('should handle bakery items with ounces', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(1, 'pound', 'bakery');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('ounce');
      expect(result.quantity).toBe(16);
    });

    it('should handle beverages with fluid ounces', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(1, 'liter', 'beverages');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('fluid ounce');
      expect(result.quantity).toBeGreaterThan(30);
    });

    it('should handle pantry items', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(2, 'cup', 'pantry');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('cup');
      expect(result.quantity).toBe(2);
    });

    it('should store original values when conversion occurs', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(1, 'cup', 'dairy');
      expect(result.originalQuantity).toBe(1);
      expect(result.originalUnit).toBe('cup');
      expect(result.quantity).not.toBe(1);
    });

    it('should handle unknown category by using default mapping', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(1, 'cup', 'unknownCategory');
      expect(result).toBeDefined();
      expect(result.quantity).toBe(1);
    });

    it('should handle zero quantity', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(0, 'cup', 'dairy');
      expect(result.quantity).toBe(0);
      expect(result.isCompatible).toBeDefined();
    });

    it('should handle decimal quantities', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(0.5, 'cup', 'pantry');
      expect(result.quantity).toBeCloseTo(0.5, 1);
      expect(result.unit).toBe('cup');
    });

    it('should handle large quantities', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(100, 'ounce', 'meat');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('pound');
      expect(result.quantity).toBeCloseTo(6.25, 1);
    });

    it('should handle frozen category', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(12, 'ounce', 'frozen');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('ounce');
      expect(result.quantity).toBe(12);
    });

    it('should handle health category', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(250, 'ml', 'health');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('fluid ounce');
      expect(result.quantity).toBeGreaterThan(8);
    });

    it('should handle household category', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(1, 'gallon', 'household');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('fluid ounce');
      expect(result.quantity).toBe(128);
    });

    it('should handle snacks category', () => {
      const result = InstacartUnitMapper.mapToInstacartUnit(8, 'ounce', 'snacks');
      expect(result.isCompatible).toBe(true);
      expect(result.unit).toBe('ounce');
      expect(result.quantity).toBe(8);
    });
  });

  describe('isInstacartCompatible', () => {
    it('should return true for cup', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('cup');
      expect(result).toBe(true);
    });

    it('should return true for fluid ounce', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('fluid ounce');
      expect(result).toBe(true);
    });

    it('should return true for pound', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('pound');
      expect(result).toBe(true);
    });

    it('should return true for ounce', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('ounce');
      expect(result).toBe(true);
    });

    it('should return true for each', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('each');
      expect(result).toBe(true);
    });

    it('should return false for milliliter', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('milliliter');
      expect(result).toBe(false);
    });

    it('should return false for gram', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('gram');
      expect(result).toBe(false);
    });

    it('should handle case insensitivity', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('CUP');
      expect(result).toBe(true);
    });

    it('should handle unit aliases', () => {
      const result = InstacartUnitMapper.isInstacartCompatible('lb');
      expect(result).toBe(true);
    });
  });
});
