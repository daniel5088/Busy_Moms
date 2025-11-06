import React from 'react';
import { ALL as ALL_COLORS } from '../../lib/colorPalette';

type Props = {
  value: string;
  usedColors: string[];
  onChange: (hex: string) => void;
};

export default function ColorPicker({ value, usedColors, onChange }: Props) {
  const isColorDisabled = (color: string): boolean => {
    if (color === value) {
      return false;
    }
    return usedColors.includes(color);
  };

  const isColorSelected = (color: string): boolean => {
    return color === value;
  };

  return (
    <div role="radiogroup" aria-label="Choose a color" className="w-full">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {ALL_COLORS.map((color) => {
          const disabled = isColorDisabled(color);
          const selected = isColorSelected(color);

          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => !disabled && onChange(color)}
              className={`
                w-12 h-12 rounded-full transition-all
                focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-gray-300
                ${selected ? 'ring-4 ring-offset-2 ring-gray-800 scale-110' : ''}
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
              `}
              style={{ backgroundColor: color }}
              aria-label={`Color ${color}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/*
Usage Example:

import ColorPicker from './components/ColorPicker';

function MyComponent() {
  const [selectedColor, setSelectedColor] = useState('#A5D8FF');
  const usedColors = ['#F8B4B4', '#FBC9A9']; // Colors already used by other members

  return (
    <ColorPicker
      value={selectedColor}
      usedColors={usedColors}
      onChange={(newColor) => setSelectedColor(newColor)}
    />
  );
}
*/
