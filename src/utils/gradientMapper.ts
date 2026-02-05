export function getGradientClasses(from: string, to: string): string {
  const key = `${from}-${to}`;
  const gradientMap: Record<string, string> = {
    'orange-600-orange-700': 'from-orange-600 to-orange-600',
    'purple-600-purple-700': 'from-purple-600 to-purple-600',
    'green-600-green-700': 'from-green-600 to-green-600',
    'blue-600-blue-700': 'from-blue-600 to-blue-600',
    'teal-600-teal-700': 'from-teal-600 to-teal-600',
    'rose-600-rose-700': 'from-rose-600 to-rose-600',
    'indigo-600-indigo-700': 'from-indigo-600 to-indigo-600',
    'pink-600-rose-600': 'from-pink-600 to-pink-600',
    'gray-600-gray-700': 'from-gray-600 to-gray-600',
  };
  return gradientMap[key] || 'from-orange-500 to-pink-500';
}

export function getGradientHoverClasses(from: string, to: string): string {
  const key = `${from}-${to}`;
  const hoverMap: Record<string, string> = {
    'orange-600-orange-700': 'hover:from-orange-700 hover:to-orange-700',
    'purple-600-purple-700': 'hover:from-purple-700 hover:to-purple-700',
    'green-600-green-700': 'hover:from-green-700 hover:to-green-700',
    'blue-600-blue-700': 'hover:from-blue-700 hover:to-blue-700',
    'teal-600-teal-700': 'hover:from-teal-700 hover:to-teal-700',
    'rose-600-rose-700': 'hover:from-rose-700 hover:to-rose-700',
    'indigo-600-indigo-700': 'hover:from-indigo-700 hover:to-indigo-700',
    'pink-600-rose-600': 'hover:from-pink-700 hover:to-pink-700',
    'gray-600-gray-700': 'hover:from-gray-700 hover:to-gray-700',
  };
  return hoverMap[key] || 'hover:from-orange-600 hover:to-pink-600';
}