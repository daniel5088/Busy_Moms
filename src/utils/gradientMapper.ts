// Maps gradient color names to Tailwind CSS classes
export function getGradientClasses(from: string, to: string): string {
  const key = `${from}-${to}`;
  const gradientMap: Record<string, string> = {
    // Original hardcoded colors (solid colors, not gradients)
    'amber-100-amber-900': 'from-amber-100 to-amber-100',
    'purple-100-purple-900': 'from-purple-100 to-purple-100',
    'green-100-green-900': 'from-green-100 to-green-100',
    'blue-100-blue-900': 'from-blue-100 to-blue-100',
    'teal-100-teal-900': 'from-teal-100 to-teal-100',
    'rose-100-rose-900': 'from-rose-100 to-rose-100',
    'indigo-100-indigo-900': 'from-indigo-100 to-indigo-100',
    'pink-100-pink-900': 'from-pink-100 to-pink-100',
    'gray-100-gray-700': 'from-gray-100 to-gray-100',
    
    // Legacy gradient mappings (if needed)
    'orange-500-pink-500': 'from-orange-500 to-pink-500',
    'purple-500-violet-500': 'from-purple-500 to-violet-500',
    'green-500-emerald-500': 'from-green-500 to-emerald-500',
    'blue-500-cyan-500': 'from-blue-500 to-cyan-500',
    'teal-500-cyan-500': 'from-teal-500 to-cyan-500',
    'rose-500-pink-500': 'from-rose-500 to-pink-500',
    'slate-500-gray-600': 'from-slate-500 to-gray-600',
    'amber-500-orange-500': 'from-amber-500 to-orange-500',
    'yellow-500-orange-500': 'from-yellow-500 to-orange-500',
  };
  return gradientMap[key] || 'from-orange-500 to-pink-500';
}

export function getGradientHoverClasses(from: string, to: string): string {
  const key = `${from}-${to}`;
  const hoverMap: Record<string, string> = {
    // Hover states for original colors (slightly darker on hover)
    'amber-100-amber-900': 'hover:from-amber-200 hover:to-amber-200',
    'purple-100-purple-900': 'hover:from-purple-200 hover:to-purple-200',
    'green-100-green-900': 'hover:from-green-200 hover:to-green-200',
    'blue-100-blue-900': 'hover:from-blue-200 hover:to-blue-200',
    'teal-100-teal-900': 'hover:from-teal-200 hover:to-teal-200',
    'rose-100-rose-900': 'hover:from-rose-200 hover:to-rose-200',
    'indigo-100-indigo-900': 'hover:from-indigo-200 hover:to-indigo-200',
    'pink-100-pink-900': 'hover:from-pink-200 hover:to-pink-200',
    'gray-100-gray-700': 'hover:from-gray-200 hover:to-gray-200',
    
    // Legacy hover states
    'orange-500-pink-500': 'hover:from-orange-600 hover:to-pink-600',
    'purple-500-violet-500': 'hover:from-purple-600 hover:to-violet-600',
    'green-500-emerald-500': 'hover:from-green-600 hover:to-emerald-600',
    'blue-500-cyan-500': 'hover:from-blue-600 hover:to-cyan-600',
    'teal-500-cyan-500': 'hover:from-teal-600 hover:to-cyan-600',
    'rose-500-pink-500': 'hover:from-rose-600 hover:to-pink-600',
    'slate-500-gray-600': 'hover:from-slate-600 hover:to-gray-700',
    'amber-500-orange-500': 'hover:from-amber-600 hover:to-orange-600',
    'yellow-500-orange-500': 'hover:from-yellow-600 hover:to-orange-600',
  };
  return hoverMap[key] || 'hover:from-orange-600 hover:to-pink-600';
}