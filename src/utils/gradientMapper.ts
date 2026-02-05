// Maps gradient color names to Tailwind CSS classes
export function getGradientClasses(from: string, to: string): string {
  const key = `${from}-${to}`;

  const gradientMap: Record<string, string> = {
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
