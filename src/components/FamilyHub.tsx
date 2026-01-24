import React, { useState } from 'react';
import { Users, FolderOpen, UserPlus, ShoppingBag, CheckSquare, Heart } from 'lucide-react';
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
    {
      id: 'wellness' as SubScreen,
      icon: Heart,
      title: 'Wellness',
      description: 'Cycle tracking & health insights',
      color: 'from-pink-400 to-rose-400',
    },
  ];

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24"
      aria-label="Family hub main content"
    >
      <NavigationHeader
        title="Family"
        subtitle="Manage your family's activities and organization"
      />

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-6">
        <p
          id="family-hub-intro"
          className="text-center text-base text-gray-600 dark:text-gray-400 mt-2 mb-4 max-w-2xl mx-auto"
        >
          Quick access to your family's shared spaces — folders, contacts, tasks, shopping, and wellness.
        </p>

        <section aria-label="Quick access features">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {familyFeatures.map((feature) => (
              <button
                key={feature.id}
                type="button"
                onClick={() => onNavigateToSubScreen(feature.id)}
                aria-labelledby={`family-feature-title-${feature.id}`}
                aria-describedby={`family-feature-desc-${feature.id}`}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all group flex flex-col items-center text-center w-full min-w-0"
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  aria-hidden="true"
                >
                  <feature.icon className="w-7 h-7 text-white" aria-hidden="true" />
                </div>
                <h3
                  id={`family-feature-title-${feature.id}`}
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
                >
                  {feature.title}
                </h3>
                <p
                  id={`family-feature-desc-${feature.id}`}
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  {feature.description}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
