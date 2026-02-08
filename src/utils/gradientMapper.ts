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

export interface QuickActionColors {
  bgColor: string;
  borderColor: string;
  iconBgColor: string;
  iconColor: string;
  hoverBg: string;
}

export function getQuickActionColors(actionTypeId: string): QuickActionColors {
  const colorMap: Record<string, QuickActionColors> = {
    'shopping': {
      bgColor: 'bg-amber-50 dark:bg-gray-800',
      borderColor: 'border-amber-200 dark:border-gray-700',
      iconBgColor: 'bg-amber-100 dark:bg-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
      hoverBg: 'hover:bg-amber-100 dark:hover:bg-gray-700',
    },
    'quick-links': {
      bgColor: 'bg-purple-50 dark:bg-gray-800',
      borderColor: 'border-purple-200 dark:border-gray-700',
      iconBgColor: 'bg-purple-100 dark:bg-purple-900',
      iconColor: 'text-purple-600 dark:text-purple-400',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-gray-700',
    },
    'tasks': {
      bgColor: 'bg-green-50 dark:bg-gray-800',
      borderColor: 'border-green-200 dark:border-gray-700',
      iconBgColor: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-700 dark:text-green-400',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-gray-700',
    },
    'contacts': {
      bgColor: 'bg-blue-50 dark:bg-gray-800',
      borderColor: 'border-blue-200 dark:border-gray-700',
      iconBgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-gray-700',
    },
    'scan-events': {
      bgColor: 'bg-teal-50 dark:bg-gray-800',
      borderColor: 'border-teal-200 dark:border-gray-700',
      iconBgColor: 'bg-teal-100 dark:bg-teal-900',
      iconColor: 'text-teal-700 dark:text-teal-400',
      hoverBg: 'hover:bg-teal-100 dark:hover:bg-gray-700',
    },
    'cycle-tracker': {
      bgColor: 'bg-rose-50 dark:bg-gray-800',
      borderColor: 'border-rose-200 dark:border-gray-700',
      iconBgColor: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
      hoverBg: 'hover:bg-rose-100 dark:hover:bg-gray-700',
    },
    'life-receipts': {
      bgColor: 'bg-indigo-50 dark:bg-gray-800',
      borderColor: 'border-indigo-200 dark:border-gray-700',
      iconBgColor: 'bg-indigo-100 dark:bg-indigo-900',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      hoverBg: 'hover:bg-indigo-100 dark:hover:bg-gray-700',
    },
    'gift-finder': {
      bgColor: 'bg-pink-50 dark:bg-gray-800',
      borderColor: 'border-pink-200 dark:border-gray-700',
      iconBgColor: 'bg-pink-100 dark:bg-pink-900',
      iconColor: 'text-pink-600 dark:text-pink-400',
      hoverBg: 'hover:bg-pink-100 dark:hover:bg-gray-700',
    },
    'recipes': {
      bgColor: 'bg-orange-50 dark:bg-gray-800',
      borderColor: 'border-orange-200 dark:border-gray-700',
      iconBgColor: 'bg-orange-100 dark:bg-orange-900',
      iconColor: 'text-orange-600 dark:text-orange-400',
      hoverBg: 'hover:bg-orange-100 dark:hover:bg-gray-700',
    },
  };

  return colorMap[actionTypeId] || {
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700',
    iconBgColor: 'bg-gray-100 dark:bg-gray-900',
    iconColor: 'text-gray-600 dark:text-gray-400',
    hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-700',
  };
}