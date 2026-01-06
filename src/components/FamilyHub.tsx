import React, { useState } from 'react';
import { Users, FolderOpen, UserPlus, ShoppingBag, CheckSquare } from 'lucide-react';
import { NavigationHeader } from './NavigationHeader';
// import { FamilyHubSkeleton } from './skeletons/FamilyHubSkeleton';
import { SubScreen, Screen } from '../App';

interface FamilyHubProps {
  onNavigateToSubScreen: (screen: SubScreen) => void;
  onNavigateToScreen: (screen: Screen) => void;
}

export function FamilyHub({ onNavigateToSubScreen, onNavigateToScreen }: FamilyHubProps) {
  // TODO: Uncomment when real data loading is implemented
  // const [loading, setLoading] = useState(true);

  // Alvaros Skeletons
  // TODO: Activate this when FamilyHub has real data loading from Supabase
  // if (loading) {
  //   return <FamilyHubSkeleton />;
  // }

  const familyFeatures = [
    {
      id: 'family-folders' as SubScreen,
      icon: FolderOpen,
      title: 'Family Folders',
      description: 'Organize by family member',
      color: 'from-violet-400 to-purple-400',
    },
    {
      id: 'contacts' as SubScreen,
      icon: Users,
      title: 'Contacts',
      description: 'Manage family contacts',
      color: 'from-rose-400 to-pink-400',
    },
    {
      id: 'tasks' as SubScreen,
      icon: CheckSquare,
      title: 'Tasks',
      description: 'Family task management',
      color: 'from-amber-400 to-orange-400',
    },
    {
      id: 'shopping' as SubScreen,
      icon: ShoppingBag,
      title: 'Shopping',
      description: 'Shopping lists and items',
      color: 'from-fuchsia-400 to-pink-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      <NavigationHeader
        title="Family"
        subtitle="Manage your family's activities and organization"
      />

      <div className="max-w-7xl mx-auto px-4 pt-16 pb-6">
        <p className="text-center text-base text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Quick access to your family's shared spaces — folders, contacts, tasks, and shopping.
        </p>

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {familyFeatures.map((feature) => (
            <button
              key={feature.id}
              onClick={() => onNavigateToSubScreen(feature.id)}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all group flex flex-col items-center text-center w-full min-w-0"
            >
              <div
                className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
