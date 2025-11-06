import React from 'react';
import { Trash2 } from 'lucide-react';
import ColorPicker from './ColorPicker';

export type FamilyMember = {
  id: string;
  user_id?: string;
  name: string;
  relationship?: string;
  age?: number;
  color: string;
  imported_from_contact?: boolean;
  device_contact_id?: string | null;
};

type Props = {
  member: FamilyMember;
  usedColors: string[];
  onChange: (updates: Partial<FamilyMember>) => void;
  onRemove?: () => void;
};

export default function FamilyMemberCard({
  member,
  usedColors,
  onChange,
  onRemove,
}: Props) {
  const isNameEmpty = !member.name || member.name.trim() === '';
  const showAgeField = member.relationship === 'Child';

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ name: e.target.value });
  };

  const handleRelationshipChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const relationship = e.target.value;
    const updates: Partial<FamilyMember> = { relationship };

    if (relationship !== 'Child' && member.age !== undefined) {
      updates.age = undefined;
    }

    onChange(updates);
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const age = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onChange({ age });
  };

  const handleColorChange = (color: string) => {
    onChange({ color });
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-4">
        <div>
          <label
            htmlFor={`name-${member.id}`}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id={`name-${member.id}`}
            value={member.name}
            onChange={handleNameChange}
            aria-invalid={isNameEmpty}
            aria-describedby={isNameEmpty ? `name-error-${member.id}` : undefined}
            className={`
              w-full px-4 py-2.5 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-1
              transition-colors
              ${
                isNameEmpty
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-500 bg-white'
              }
            `}
            placeholder="Enter name"
          />
          {isNameEmpty && (
            <p
              id={`name-error-${member.id}`}
              className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
            >
              <span className="font-medium">⚠</span>
              Name is required
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`relationship-${member.id}`}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Relationship
          </label>
          <select
            id={`relationship-${member.id}`}
            value={member.relationship || ''}
            onChange={handleRelationshipChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 bg-white transition-colors"
          >
            <option value="">Select relationship</option>
            <option value="Mom">Mom</option>
            <option value="Dad">Dad</option>
            <option value="Child">Child</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {showAgeField && (
          <div>
            <label
              htmlFor={`age-${member.id}`}
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Age
            </label>
            <input
              type="number"
              id={`age-${member.id}`}
              value={member.age ?? ''}
              onChange={handleAgeChange}
              min="0"
              max="120"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 bg-white transition-colors"
              placeholder="Enter age"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose Color
          </label>
          <ColorPicker
            value={member.color}
            usedColors={usedColors}
            onChange={handleColorChange}
          />
        </div>
      </div>

      {onRemove && (
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
          >
            <Trash2 size={16} />
            Remove member
          </button>
        </div>
      )}
    </div>
  );
}
