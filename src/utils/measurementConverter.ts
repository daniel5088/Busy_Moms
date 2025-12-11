/**
 * @fileoverview Cooking measurement unit conversion utilities for recipe and shopping list management.
 *
 * This module provides comprehensive measurement conversion capabilities supporting 50+ cooking units
 * across volume, weight, and count measurement types. It handles both metric and imperial systems
 * with precise conversion factors and intelligent unit normalization.
 *
 * @example
 * // Convert between units
 * const result = MeasurementConverter.convert(2, 'cups', 'ml');
 * console.log(result); // { quantity: 473.18, unit: 'milliliter', conversionApplied: true, confidence: 1.0 }
 *
 * @example
 * // Convert to user's preferred system
 * const metric = MeasurementConverter.convertToSystem(1, 'cup', 'metric');
 * console.log(metric); // { quantity: 236.59, unit: 'milliliter', ... }
 */

/**
 * Measurement system type for converting between metric and imperial units.
 *
 * - `'metric'`: Metric system (grams, milliliters, kilograms, liters)
 * - `'imperial'`: Imperial/US customary system (cups, pounds, ounces, tablespoons)
 */
export type MeasurementSystem = 'metric' | 'imperial'

/**
 * Supported volume measurement units with common aliases.
 * Includes both metric (ml, l) and imperial (cup, tbsp, tsp, fl oz, gal, pint, quart) units.
 * All volume conversions use milliliters as the base unit.
 */
export type VolumeUnit =
  | 'cup' | 'cups' | 'c'
  | 'tablespoon' | 'tablespoons' | 'tbsp' | 'tbs'
  | 'teaspoon' | 'teaspoons' | 'tsp'
  | 'fluid ounce' | 'fluid ounces' | 'fl oz' | 'floz'
  | 'gallon' | 'gallons' | 'gal'
  | 'milliliter' | 'milliliters' | 'ml'
  | 'liter' | 'liters' | 'l'
  | 'pint' | 'pints' | 'pt'
  | 'quart' | 'quarts' | 'qt'

/**
 * Supported weight measurement units with common aliases.
 * Includes both metric (g, kg, mg) and imperial (lb, oz) units.
 * All weight conversions use grams as the base unit.
 */
export type WeightUnit =
  | 'gram' | 'grams' | 'g'
  | 'kilogram' | 'kilograms' | 'kg'
  | 'pound' | 'pounds' | 'lb' | 'lbs'
  | 'ounce' | 'ounces' | 'oz'
  | 'milligram' | 'milligrams' | 'mg'

/**
 * Supported count-based units for discrete items.
 * These units do not convert between each other and are used for counting
 * whole items like fruits, vegetables, cans, packages, etc.
 */
export type CountUnit =
  | 'each' | 'ea'
  | 'bunch' | 'bunches'
  | 'can' | 'cans'
  | 'package' | 'packages' | 'pkg'
  | 'item' | 'items'
  | 'piece' | 'pieces'
  | 'clove' | 'cloves'
  | 'slice' | 'slices'

/**
 * Union type of all supported measurement units (volume, weight, and count).
 */
export type Unit = VolumeUnit | WeightUnit | CountUnit

/**
 * Type of measurement determining which units can be converted between each other.
 *
 * - `'volume'`: Liquid and dry volume measurements (cups, ml, liters, etc.)
 * - `'weight'`: Mass measurements (grams, pounds, ounces, etc.)
 * - `'count'`: Discrete item counts (each, bunch, can, etc.)
 *
 * Note: Conversions only work between units of the same measurement type.
 */
export type MeasurementType = 'volume' | 'weight' | 'count'

/**
 * Result of a measurement conversion operation.
 *
 * @property quantity - The converted quantity value (rounded to 2 decimal places)
 * @property unit - The target unit after conversion (normalized form)
 * @property originalQuantity - The input quantity before conversion
 * @property originalUnit - The input unit before normalization/conversion
 * @property conversionApplied - Whether a conversion was actually performed
 * @property confidence - Confidence score (0-1) indicating conversion reliability:
 *   - 1.0: Successful conversion or same unit
 *   - 0.0: Conversion failed (incompatible units)
 *
 * @example
 * const result: ConversionResult = {
 *   quantity: 473.18,
 *   unit: 'milliliter',
 *   originalQuantity: 2,
 *   originalUnit: 'cup',
 *   conversionApplied: true,
 *   confidence: 1.0
 * }
 */
export interface ConversionResult {
  quantity: number
  unit: string
  originalQuantity: number
  originalUnit: string
  conversionApplied: boolean
  confidence: number
}

/**
 * Utility class for converting cooking measurements between different units and systems.
 *
 * This class provides static methods for:
 * - Converting between volume units (cups ↔ ml, tbsp ↔ fl oz, etc.)
 * - Converting between weight units (grams ↔ pounds, oz ↔ kg, etc.)
 * - Normalizing unit aliases (e.g., "c" → "cup", "tbsp" → "tablespoon")
 * - Converting between metric and imperial systems
 * - Validating and formatting measurement quantities
 * - Formatting quantities as user-friendly fractions (e.g., "1 1/2" instead of "1.5")
 *
 * All conversions use precise conversion factors and return results with confidence scores
 * to indicate conversion reliability. Units of different types (volume vs weight) cannot
 * be converted between each other and will return a confidence score of 0.
 *
 * @example
 * // Basic unit conversion
 * MeasurementConverter.convert(2, 'cups', 'ml')
 * // Returns: { quantity: 473.18, unit: 'milliliter', conversionApplied: true, confidence: 1.0 }
 *
 * @example
 * // Convert to metric system
 * MeasurementConverter.convertToSystem(1, 'cup', 'metric')
 * // Returns: { quantity: 236.59, unit: 'milliliter', ... }
 *
 * @example
 * // Normalize unit aliases
 * MeasurementConverter.normalizeUnit('tbsp') // Returns: 'tablespoon'
 * MeasurementConverter.normalizeUnit('c') // Returns: 'cup'
 *
 * @example
 * // Format quantities with fractions
 * MeasurementConverter.formatQuantity(1.5) // Returns: '1 1/2'
 * MeasurementConverter.formatQuantity(0.25) // Returns: '1/4'
 */
export class MeasurementConverter {
  /**
   * Conversion factors from volume units to milliliters.
   * All volume conversions use milliliters as the intermediate base unit.
   * @private
   */
  private static readonly VOLUME_TO_ML: Record<string, number> = {
    'cup': 236.588,
    'cups': 236.588,
    'c': 236.588,
    'tablespoon': 14.787,
    'tablespoons': 14.787,
    'tbsp': 14.787,
    'tbs': 14.787,
    'teaspoon': 4.929,
    'teaspoons': 4.929,
    'tsp': 4.929,
    'fluid ounce': 29.574,
    'fluid ounces': 29.574,
    'fl oz': 29.574,
    'floz': 29.574,
    'gallon': 3785.41,
    'gallons': 3785.41,
    'gal': 3785.41,
    'milliliter': 1,
    'milliliters': 1,
    'ml': 1,
    'liter': 1000,
    'liters': 1000,
    'l': 1000,
    'pint': 473.176,
    'pints': 473.176,
    'pt': 473.176,
    'quart': 946.353,
    'quarts': 946.353,
    'qt': 946.353,
  }

  /**
   * Conversion factors from weight units to grams.
   * All weight conversions use grams as the intermediate base unit.
   * @private
   */
  private static readonly WEIGHT_TO_GRAMS: Record<string, number> = {
    'gram': 1,
    'grams': 1,
    'g': 1,
    'kilogram': 1000,
    'kilograms': 1000,
    'kg': 1000,
    'pound': 453.592,
    'pounds': 453.592,
    'lb': 453.592,
    'lbs': 453.592,
    'ounce': 28.3495,
    'ounces': 28.3495,
    'oz': 28.3495,
    'milligram': 0.001,
    'milligrams': 0.001,
    'mg': 0.001,
  }

  /**
   * Mapping of common unit aliases to their canonical/normalized forms.
   * Used to standardize unit names before conversion (e.g., "c" → "cup", "tbsp" → "tablespoon").
   * @private
   */
  private static readonly UNIT_ALIASES: Record<string, string> = {
    'c': 'cup',
    'cups': 'cup',
    'tbsp': 'tablespoon',
    'tbs': 'tablespoon',
    'tablespoons': 'tablespoon',
    'tsp': 'teaspoon',
    'teaspoons': 'teaspoon',
    'fl oz': 'fluid ounce',
    'floz': 'fluid ounce',
    'fluid ounces': 'fluid ounce',
    'gal': 'gallon',
    'gallons': 'gallon',
    'ml': 'milliliter',
    'milliliters': 'milliliter',
    'l': 'liter',
    'liters': 'liter',
    'pt': 'pint',
    'pints': 'pint',
    'qt': 'quart',
    'quarts': 'quart',
    'g': 'gram',
    'grams': 'gram',
    'kg': 'kilogram',
    'kilograms': 'kilogram',
    'lb': 'pound',
    'lbs': 'pound',
    'pounds': 'pound',
    'oz': 'ounce',
    'ounces': 'ounce',
    'mg': 'milligram',
    'milligrams': 'milligram',
    'ea': 'each',
    'bunches': 'bunch',
    'cans': 'can',
    'packages': 'package',
    'pkg': 'package',
    'items': 'item',
    'pieces': 'piece',
    'cloves': 'clove',
    'slices': 'slice',
  }

  /**
   * Normalizes a unit string to its canonical form.
   *
   * Converts unit aliases and abbreviations to their standard form (e.g., "c" → "cup",
   * "tbsp" → "tablespoon", "kg" → "kilogram"). The normalization is case-insensitive
   * and trims whitespace.
   *
   * @param unit - The unit string to normalize (e.g., "C", "tbsp", "lbs")
   * @returns The normalized unit name in lowercase (e.g., "cup", "tablespoon", "pound")
   *
   * @example
   * MeasurementConverter.normalizeUnit('C') // Returns: 'cup'
   * MeasurementConverter.normalizeUnit('tbsp') // Returns: 'tablespoon'
   * MeasurementConverter.normalizeUnit('Lbs') // Returns: 'pound'
   */
  static normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim()
    return this.UNIT_ALIASES[normalized] || normalized
  }

  /**
   * Determines the measurement type (volume, weight, or count) for a given unit.
   *
   * This is useful for validating conversions, since only units of the same type
   * can be converted between each other.
   *
   * @param unit - The unit to classify (e.g., "cup", "gram", "each")
   * @returns The measurement type: 'volume', 'weight', or 'count'
   *
   * @example
   * MeasurementConverter.getMeasurementType('cup') // Returns: 'volume'
   * MeasurementConverter.getMeasurementType('lb') // Returns: 'weight'
   * MeasurementConverter.getMeasurementType('each') // Returns: 'count'
   */
  static getMeasurementType(unit: string): MeasurementType {
    const normalized = this.normalizeUnit(unit)

    if (normalized in this.VOLUME_TO_ML) {
      return 'volume'
    }

    if (normalized in this.WEIGHT_TO_GRAMS) {
      return 'weight'
    }

    return 'count'
  }

  /**
   * Converts a volume quantity from one unit to another.
   *
   * Uses milliliters as the intermediate base unit for all conversions.
   * Both units must be valid volume units, otherwise an error is thrown.
   *
   * @param quantity - The numeric quantity to convert
   * @param fromUnit - The source volume unit (e.g., "cups", "tbsp", "ml")
   * @param toUnit - The target volume unit (e.g., "ml", "fl oz", "liters")
   * @returns The converted quantity as a number
   * @throws {Error} If either unit is not a valid volume unit
   *
   * @example
   * MeasurementConverter.convertVolume(2, 'cups', 'ml') // Returns: 473.176
   * MeasurementConverter.convertVolume(1, 'gallon', 'liters') // Returns: 3.78541
   * MeasurementConverter.convertVolume(500, 'ml', 'cups') // Returns: ~2.11
   */
  static convertVolume(quantity: number, fromUnit: string, toUnit: string): number {
    const normalizedFrom = this.normalizeUnit(fromUnit)
    const normalizedTo = this.normalizeUnit(toUnit)

    if (normalizedFrom === normalizedTo) {
      return quantity
    }

    const fromFactor = this.VOLUME_TO_ML[normalizedFrom]
    const toFactor = this.VOLUME_TO_ML[normalizedTo]

    if (!fromFactor || !toFactor) {
      throw new Error(`Cannot convert volume from ${fromUnit} to ${toUnit}`)
    }

    const milliliters = quantity * fromFactor
    return milliliters / toFactor
  }

  /**
   * Converts a weight quantity from one unit to another.
   *
   * Uses grams as the intermediate base unit for all conversions.
   * Both units must be valid weight units, otherwise an error is thrown.
   *
   * @param quantity - The numeric quantity to convert
   * @param fromUnit - The source weight unit (e.g., "pounds", "oz", "g")
   * @param toUnit - The target weight unit (e.g., "kg", "grams", "lb")
   * @returns The converted quantity as a number
   * @throws {Error} If either unit is not a valid weight unit
   *
   * @example
   * MeasurementConverter.convertWeight(1, 'lb', 'grams') // Returns: 453.592
   * MeasurementConverter.convertWeight(500, 'grams', 'lb') // Returns: ~1.10
   * MeasurementConverter.convertWeight(16, 'oz', 'lb') // Returns: 1.0
   */
  static convertWeight(quantity: number, fromUnit: string, toUnit: string): number {
    const normalizedFrom = this.normalizeUnit(fromUnit)
    const normalizedTo = this.normalizeUnit(toUnit)

    if (normalizedFrom === normalizedTo) {
      return quantity
    }

    const fromFactor = this.WEIGHT_TO_GRAMS[normalizedFrom]
    const toFactor = this.WEIGHT_TO_GRAMS[normalizedTo]

    if (!fromFactor || !toFactor) {
      throw new Error(`Cannot convert weight from ${fromUnit} to ${toUnit}`)
    }

    const grams = quantity * fromFactor
    return grams / toFactor
  }

  /**
   * Converts a quantity from one unit to another with detailed result information.
   *
   * This is the primary conversion method that:
   * - Normalizes units to canonical forms
   * - Validates that units are of the same measurement type
   * - Performs the conversion using appropriate methods
   * - Returns a detailed result with confidence scoring
   * - Handles errors gracefully by returning confidence: 0
   *
   * Units of different types (volume vs weight) cannot be converted and will
   * return the original quantity with confidence: 0.
   *
   * @param quantity - The numeric quantity to convert
   * @param fromUnit - The source unit (e.g., "cups", "C", "lbs")
   * @param toUnit - The target unit (e.g., "ml", "grams", "oz")
   * @returns A ConversionResult object with:
   *   - quantity: The converted value (rounded to 2 decimals)
   *   - unit: The normalized target unit
   *   - originalQuantity: The input quantity
   *   - originalUnit: The normalized input unit
   *   - conversionApplied: Whether conversion was performed
   *   - confidence: 1.0 for success, 0 for failure
   *
   * @example
   * // Successful conversion
   * const result = MeasurementConverter.convert(2, 'cups', 'ml');
   * // Returns: { quantity: 473.18, unit: 'milliliter', conversionApplied: true, confidence: 1.0, ... }
   *
   * @example
   * // Same unit (no conversion needed)
   * const result = MeasurementConverter.convert(5, 'cup', 'cups');
   * // Returns: { quantity: 5, unit: 'cup', conversionApplied: false, confidence: 1.0, ... }
   *
   * @example
   * // Incompatible units (volume vs weight)
   * const result = MeasurementConverter.convert(2, 'cups', 'grams');
   * // Returns: { quantity: 2, unit: 'cup', conversionApplied: false, confidence: 0, ... }
   */
  static convert(quantity: number, fromUnit: string, toUnit: string): ConversionResult {
    const normalizedFrom = this.normalizeUnit(fromUnit)
    const normalizedTo = this.normalizeUnit(toUnit)

    if (normalizedFrom === normalizedTo) {
      return {
        quantity,
        unit: normalizedTo,
        originalQuantity: quantity,
        originalUnit: normalizedFrom,
        conversionApplied: false,
        confidence: 1.0,
      }
    }

    const fromType = this.getMeasurementType(normalizedFrom)
    const toType = this.getMeasurementType(normalizedTo)

    if (fromType !== toType) {
      return {
        quantity,
        unit: normalizedFrom,
        originalQuantity: quantity,
        originalUnit: normalizedFrom,
        conversionApplied: false,
        confidence: 0,
      }
    }

    let convertedQuantity: number
    try {
      if (fromType === 'volume') {
        convertedQuantity = this.convertVolume(quantity, normalizedFrom, normalizedTo)
      } else if (fromType === 'weight') {
        convertedQuantity = this.convertWeight(quantity, normalizedFrom, normalizedTo)
      } else {
        convertedQuantity = quantity
      }

      const rounded = Math.round(convertedQuantity * 100) / 100

      return {
        quantity: rounded,
        unit: normalizedTo,
        originalQuantity: quantity,
        originalUnit: normalizedFrom,
        conversionApplied: true,
        confidence: 1.0,
      }
    } catch (error) {
      return {
        quantity,
        unit: normalizedFrom,
        originalQuantity: quantity,
        originalUnit: normalizedFrom,
        conversionApplied: false,
        confidence: 0,
      }
    }
  }

  /**
   * Returns the default unit for a given measurement type and system.
   *
   * This is useful for determining the target unit when converting recipes
   * or shopping lists to a user's preferred measurement system.
   *
   * @param measurementType - The type of measurement ('volume', 'weight', or 'count')
   * @param system - The measurement system ('metric' or 'imperial')
   * @returns The default unit string for that type/system combination:
   *   - Volume: 'milliliter' (metric) or 'cup' (imperial)
   *   - Weight: 'gram' (metric) or 'pound' (imperial)
   *   - Count: 'each' (system-independent)
   *
   * @example
   * MeasurementConverter.getDefaultUnitForSystem('volume', 'metric') // Returns: 'milliliter'
   * MeasurementConverter.getDefaultUnitForSystem('weight', 'imperial') // Returns: 'pound'
   * MeasurementConverter.getDefaultUnitForSystem('count', 'metric') // Returns: 'each'
   */
  static getDefaultUnitForSystem(measurementType: MeasurementType, system: MeasurementSystem): string {
    if (measurementType === 'volume') {
      return system === 'metric' ? 'milliliter' : 'cup'
    }

    if (measurementType === 'weight') {
      return system === 'metric' ? 'gram' : 'pound'
    }

    return 'each'
  }

  /**
   * Converts a quantity to the default unit for a target measurement system.
   *
   * This is a convenience method that automatically selects the appropriate
   * target unit based on the measurement type and target system, then performs
   * the conversion.
   *
   * @param quantity - The numeric quantity to convert
   * @param unit - The source unit (e.g., "cups", "lbs", "each")
   * @param targetSystem - The target measurement system ('metric' or 'imperial')
   * @returns A ConversionResult with the quantity converted to the system's default unit
   *
   * @example
   * // Convert imperial volume to metric
   * MeasurementConverter.convertToSystem(2, 'cups', 'metric')
   * // Returns: { quantity: 473.18, unit: 'milliliter', conversionApplied: true, ... }
   *
   * @example
   * // Convert metric weight to imperial
   * MeasurementConverter.convertToSystem(500, 'grams', 'imperial')
   * // Returns: { quantity: 1.10, unit: 'pound', conversionApplied: true, ... }
   */
  static convertToSystem(quantity: number, unit: string, targetSystem: MeasurementSystem): ConversionResult {
    const measurementType = this.getMeasurementType(unit)
    const targetUnit = this.getDefaultUnitForSystem(measurementType, targetSystem)
    return this.convert(quantity, unit, targetUnit)
  }

  /**
   * Checks whether a unit string is a valid, supported measurement unit.
   *
   * Validates the unit after normalization against all supported volume,
   * weight, and count units.
   *
   * @param unit - The unit string to validate (e.g., "cup", "invalid-unit", "kg")
   * @returns `true` if the unit is supported, `false` otherwise
   *
   * @example
   * MeasurementConverter.isValidUnit('cup') // Returns: true
   * MeasurementConverter.isValidUnit('tbsp') // Returns: true
   * MeasurementConverter.isValidUnit('invalid') // Returns: false
   * MeasurementConverter.isValidUnit('kg') // Returns: true
   */
  static isValidUnit(unit: string): boolean {
    const normalized = this.normalizeUnit(unit)
    return normalized in this.VOLUME_TO_ML ||
           normalized in this.WEIGHT_TO_GRAMS ||
           ['each', 'bunch', 'can', 'package', 'item', 'piece', 'clove', 'slice'].includes(normalized)
  }

  /**
   * Returns an array of all supported units, optionally filtered by measurement type.
   *
   * Useful for generating dropdowns, validating input, or displaying available units.
   * Filters out multi-word variants (e.g., "fluid ounce") and single-character aliases
   * to return clean, primary unit names.
   *
   * @param measurementType - Optional filter for unit type ('volume', 'weight', or 'count').
   *                          If omitted, returns all supported units.
   * @returns Array of unit strings (e.g., ['cup', 'tablespoon', 'teaspoon', ...])
   *
   * @example
   * MeasurementConverter.getSupportedUnits('volume')
   * // Returns: ['cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', ...]
   *
   * @example
   * MeasurementConverter.getSupportedUnits('weight')
   * // Returns: ['gram', 'grams', 'kilogram', 'kg', 'pound', 'lb', ...]
   *
   * @example
   * MeasurementConverter.getSupportedUnits()
   * // Returns all 50+ supported units
   */
  static getSupportedUnits(measurementType?: MeasurementType): string[] {
    if (!measurementType) {
      return [
        ...Object.keys(this.VOLUME_TO_ML),
        ...Object.keys(this.WEIGHT_TO_GRAMS),
        'each', 'bunch', 'can', 'package', 'item', 'piece', 'clove', 'slice'
      ].filter(unit => !unit.includes(' ') && unit.length > 1)
    }

    if (measurementType === 'volume') {
      return Object.keys(this.VOLUME_TO_ML).filter(unit => !unit.includes(' ') && unit.length > 1)
    }

    if (measurementType === 'weight') {
      return Object.keys(this.WEIGHT_TO_GRAMS).filter(unit => !unit.includes(' ') && unit.length > 1)
    }

    return ['each', 'bunch', 'can', 'package', 'item', 'piece', 'clove', 'slice']
  }

  /**
   * Returns commonly used units organized by measurement type for a given system.
   *
   * This is a curated subset of units that are most frequently used in cooking,
   * useful for creating simplified UI dropdowns or default unit selections.
   *
   * @param system - The measurement system ('metric' or 'imperial')
   * @returns An object with arrays of common units for each type:
   *   - volume: Common volume units for the system
   *   - weight: Common weight units for the system
   *   - count: Common count units (system-independent)
   *
   * @example
   * MeasurementConverter.getCommonUnits('metric')
   * // Returns: {
   * //   volume: ['milliliter', 'liter', 'tablespoon', 'teaspoon'],
   * //   weight: ['gram', 'kilogram', 'milligram'],
   * //   count: ['each', 'bunch', 'can', 'package', 'item']
   * // }
   *
   * @example
   * MeasurementConverter.getCommonUnits('imperial')
   * // Returns: {
   * //   volume: ['cup', 'tablespoon', 'teaspoon', 'fluid ounce', 'gallon', 'pint', 'quart'],
   * //   weight: ['pound', 'ounce'],
   * //   count: ['each', 'bunch', 'can', 'package', 'item']
   * // }
   */
  static getCommonUnits(system: MeasurementSystem): { volume: string[], weight: string[], count: string[] } {
    if (system === 'metric') {
      return {
        volume: ['milliliter', 'liter', 'tablespoon', 'teaspoon'],
        weight: ['gram', 'kilogram', 'milligram'],
        count: ['each', 'bunch', 'can', 'package', 'item'],
      }
    }

    return {
      volume: ['cup', 'tablespoon', 'teaspoon', 'fluid ounce', 'gallon', 'pint', 'quart'],
      weight: ['pound', 'ounce'],
      count: ['each', 'bunch', 'can', 'package', 'item'],
    }
  }

  /**
   * Formats a numeric quantity as a user-friendly string with fraction support.
   *
   * Converts decimal quantities to common cooking fractions when possible
   * (e.g., 1.5 → "1 1/2", 0.25 → "1/4"). Falls back to decimal representation
   * for values that don't match common fractions.
   *
   * Supported fractions: 1/8, 1/4, 1/3, 1/2, 2/3, 3/4
   *
   * @param quantity - The numeric quantity to format
   * @returns A formatted string representation:
   *   - Whole numbers as-is (e.g., "2")
   *   - Common fractions (e.g., "1/2", "2 3/4")
   *   - Decimals rounded to 2 places for non-standard values (e.g., "1.37")
   *
   * @example
   * MeasurementConverter.formatQuantity(2) // Returns: '2'
   * MeasurementConverter.formatQuantity(1.5) // Returns: '1 1/2'
   * MeasurementConverter.formatQuantity(0.25) // Returns: '1/4'
   * MeasurementConverter.formatQuantity(0.333) // Returns: '1/3'
   * MeasurementConverter.formatQuantity(1.37) // Returns: '1.37'
   */
  static formatQuantity(quantity: number): string {
    if (quantity % 1 === 0) {
      return quantity.toString()
    }

    const fraction = this.decimalToFraction(quantity)
    if (fraction) {
      return fraction
    }

    return quantity.toFixed(2).replace(/\.?0+$/, '')
  }

  /**
   * Converts a decimal number to a fraction string if it matches common cooking fractions.
   *
   * Uses a tolerance of 0.01 to handle floating-point imprecision.
   *
   * @private
   * @param decimal - The decimal number to convert (e.g., 1.5, 0.25)
   * @returns A fraction string if matched (e.g., "1 1/2", "1/4"), or null if no match
   */
  private static decimalToFraction(decimal: number): string | null {
    const tolerance = 0.01
    const commonFractions = [
      { decimal: 0.125, fraction: '1/8' },
      { decimal: 0.25, fraction: '1/4' },
      { decimal: 0.333, fraction: '1/3' },
      { decimal: 0.5, fraction: '1/2' },
      { decimal: 0.667, fraction: '2/3' },
      { decimal: 0.75, fraction: '3/4' },
    ]

    const whole = Math.floor(decimal)
    const fractionalPart = decimal - whole

    for (const { decimal: frac, fraction } of commonFractions) {
      if (Math.abs(fractionalPart - frac) < tolerance) {
        return whole > 0 ? `${whole} ${fraction}` : fraction
      }
    }

    return null
  }
}
