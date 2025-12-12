import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormFieldProps {
  label: string;
  icon?: LucideIcon;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * Generic form field wrapper with label and optional icon
 */
export function FormField({ label, icon: Icon, required = false, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
        {Icon && <Icon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />}
        {label}
        {required && ' *'}
      </label>
      {children}
    </div>
  );
}

interface TextInputProps {
  type?: 'text' | 'email' | 'password' | 'date' | 'time' | 'number';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  focusColor?: string;
}

/**
 * Reusable text input component with consistent styling
 */
export function TextInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
  focusColor = 'focus:ring-purple-500',
}: TextInputProps) {
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 ${focusColor} focus:border-transparent text-sm sm:text-base ${className}`}
      placeholder={placeholder}
    />
  );
}

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
  focusColor?: string;
}

/**
 * Reusable textarea component with consistent styling
 */
export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 2,
  required = false,
  className = '',
  focusColor = 'focus:ring-purple-500',
}: TextAreaProps) {
  return (
    <textarea
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 ${focusColor} focus:border-transparent text-sm sm:text-base ${className}`}
      rows={rows}
      placeholder={placeholder}
    />
  );
}

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  className?: string;
  focusColor?: string;
}

/**
 * Reusable select dropdown component with consistent styling
 */
export function SelectInput({
  value,
  onChange,
  options,
  required = false,
  className = '',
  focusColor = 'focus:ring-purple-500',
}: SelectInputProps) {
  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 ${focusColor} focus:border-transparent text-sm sm:text-base ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface CheckboxInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  color?: string;
}

/**
 * Reusable checkbox component with consistent styling
 */
export function CheckboxInput({
  checked,
  onChange,
  label,
  color = 'text-purple-600',
}: CheckboxInputProps) {
  return (
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`w-3 h-3 sm:w-4 sm:h-4 ${color} border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500`}
      />
      <span className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

interface FormButtonsProps {
  onCancel: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  submitColor?: string;
  submitHoverColor?: string;
}

/**
 * Reusable form action buttons (Cancel and Submit)
 */
export function FormButtons({
  onCancel,
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  loading = false,
  submitColor = 'bg-purple-500',
  submitHoverColor = 'hover:bg-purple-600',
}: FormButtonsProps) {
  return (
    <div className="flex space-x-2 sm:space-x-3 pt-3 sm:pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
      >
        {cancelLabel}
      </button>
      <button
        type={onSubmit ? 'button' : 'submit'}
        onClick={onSubmit}
        disabled={loading}
        className={`flex-1 px-3 py-2 sm:px-4 ${submitColor} text-white rounded-lg ${submitHoverColor} transition-colors disabled:opacity-50 text-sm sm:text-base`}
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

interface GridLayoutProps {
  columns?: 1 | 2;
  children: React.ReactNode;
}

/**
 * Reusable grid layout for form fields
 */
export function GridLayout({ columns = 2, children }: GridLayoutProps) {
  return (
    <div
      className={`grid ${columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3 sm:gap-4`}
    >
      {children}
    </div>
  );
}
