import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { MeasurementConverter, MeasurementType } from '../utils/measurementConverter';
import { InstacartUnitMapper } from '../utils/instacartUnitMapper';
import { useAuth } from '../hooks/useAuth';
import { measurementPreferencesService } from '../services/measurementPreferencesService';

interface MeasurementInputProps {
  quantity: number | null;
  unit: string | null;
  ingredientName?: string;
  category?: string;
  onQuantityChange: (quantity: number | null) => void;
  onUnitChange: (unit: string | null) => void;
  showConverter?: boolean;
  preferredSystem?: 'metric' | 'imperial';
  disabled?: boolean;
  className?: string;
}

export function MeasurementInput({
  quantity,
  unit,
  ingredientName,
  category,
  onQuantityChange,
  onUnitChange,
  showConverter = true,
  preferredSystem,
  disabled = false,
  className = '',
}: MeasurementInputProps) {
  const { user } = useAuth();
  const [showConversion, setShowConversion] = useState(false);
  const [conversionResult, setConversionResult] = useState<string>('');
  const [fetchedSystem, setFetchedSystem] = useState<'metric' | 'imperial'>('imperial');

  const effectiveSystem = preferredSystem ?? fetchedSystem;

  const measurementType: MeasurementType = unit
    ? MeasurementConverter.getMeasurementType(unit)
    : 'count';

  const availableUnits = MeasurementConverter.getCommonUnits(effectiveSystem)[measurementType];

  useEffect(() => {
    if (!preferredSystem && user) {
      measurementPreferencesService
        .getPreferredSystem(user.id)
        .then(setFetchedSystem)
        .catch((error) => {
          console.error('Error fetching preferred system:', error);
        });
    }
  }, [preferredSystem, user]);

  useEffect(() => {
    if (!unit && ingredientName && category) {
      const suggestedUnit = InstacartUnitMapper.suggestUnitForIngredient(ingredientName, category);
      onUnitChange(suggestedUnit);
    }
  }, [ingredientName, category]);

  useEffect(() => {
    if (quantity && unit && showConverter) {
      updateConversion();
    }
  }, [quantity, unit, effectiveSystem]);

  const updateConversion = () => {
    if (!quantity || !unit) {
      setConversionResult('');
      return;
    }

    const targetSystem = effectiveSystem === 'metric' ? 'imperial' : 'metric';
    const converted = MeasurementConverter.convertToSystem(quantity, unit, targetSystem);

    if (converted.conversionApplied) {
      const formattedQuantity = MeasurementConverter.formatQuantity(converted.quantity);
      setConversionResult(`≈ ${formattedQuantity} ${converted.unit}`);
    } else {
      setConversionResult('');
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      onQuantityChange(null);
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onQuantityChange(num);
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    onUnitChange(newUnit || null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex space-x-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input
            type="number"
            step="any"
            min="0"
            value={quantity ?? ''}
            onChange={handleQuantityChange}
            disabled={disabled}
            placeholder="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <select
            value={unit || ''}
            onChange={handleUnitChange}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select unit</option>
            <optgroup label="Common Units">
              {availableUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </optgroup>
            {unit && !availableUnits.includes(unit) && (
              <optgroup label="Current">
                <option value={unit}>{unit}</option>
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {showConverter && conversionResult && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          <Calculator className="w-4 h-4" />
          <span>{conversionResult}</span>
        </div>
      )}

      {quantity && unit && (
        <div className="text-xs text-gray-500">
          {MeasurementConverter.formatQuantity(quantity)} {unit}
          {ingredientName && ` ${ingredientName}`}
        </div>
      )}
    </div>
  );
}
