// Maps gradient color names to Tailwind CSS classes
export function getGradientClasses(from: string, to: string): string {
  const key = `${from}-${to}`;
  const gradientMap: Record<string, string> = {
    // Solid colors matching original design
    'amber-600-amber-600': 'from-amber-600 to-amber-600',
    'purple-600-purple-600': 'from-purple-600 to-purple-600',
    'green-600-green-600': 'from-green-600 to-green-600',
    'blue-600-blue-600': 'from-blue-600 to-blue-600',
    'teal-600-teal-600': 'from-teal-600 to-teal-600',
    'rose-600-rose-600': 'from-rose-600 to-rose-600',
    'indigo-600-indigo-600': 'from-indigo-600 to-indigo-600',
    'pink-600-pink-600': 'from-pink-600 to-pink-600',
    'gray-500-gray-500': 'from-gray-500 to-gray-500',
    
    // Legacy gradient mappings
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
    // Hover states (slightly darker)
    'amber-600-amber-600': 'hover:from-amber-700 hover:to-amber-700',
    'purple-600-purple-600': 'hover:from-purple-700 hover:to-purple-700',
    'green-600-green-600': 'hover:from-green-700 hover:to-green-700',
    'blue-600-blue-600': 'hover:from-blue-700 hover:to-blue-700',
    'teal-600-teal-600': 'hover:from-teal-700 hover:to-teal-700',
    'rose-600-rose-600': 'hover:from-rose-700 hover:to-rose-700',
    'indigo-600-indigo-600': 'hover:from-indigo-700 hover:to-indigo-700',
    'pink-600-pink-600': 'hover:from-pink-700 hover:to-pink-700',
    'gray-500-gray-500': 'hover:from-gray-600 hover:to-gray-600',
    
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