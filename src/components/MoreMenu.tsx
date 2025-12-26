import React from 'react';
import {
  Settings,
  HelpCircle,
  Info,
  Bell,
  MessageCircle,
  Shield,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { NavigationHeader } from './NavigationHeader';
// import { MoreMenuSkeleton } from './skeletons/MoreMenuSkeleton';
import { SubScreen } from '../App';

interface MoreMenuProps {
  onNavigateToSubScreen: (screen: SubScreen) => void;
  onSignOut: () => void;
  userName?: string;
  userEmail?: string;
}

export function MoreMenu({ onNavigateToSubScreen, onSignOut, userName, userEmail }: MoreMenuProps) {
  // TODO: Uncomment when real data loading is implemented
  // const [loading, setLoading] = useState(true);

  // Alvaros Skeletons
  // TODO: Activate this when MoreMenu has real data loading from Supabase
  // if (loading) {
  //   return <MoreMenuSkeleton />;
  // }

  const menuSections = [
    {
      title: 'Settings',
      items: [
        {
          id: 'settings' as SubScreen,
          icon: Settings,
          title: 'App Settings',
          description: 'Preferences and configuration',
        },
      ],
    },
    {
      title: 'Features',
      items: [
        {
          icon: Sparkles,
          title: 'Daily Affirmations',
          description: 'Manage your daily encouragement',
          action: () => window.dispatchEvent(new CustomEvent('open-affirmations')),
        },
        {
          icon: Bell,
          title: 'Notifications',
          description: 'Manage alerts and reminders',
          action: () => onNavigateToSubScreen('settings' as SubScreen),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          title: 'Help & Support',
          description: 'Get help and contact support',
        },
        {
          icon: Info,
          title: 'About',
          description: 'App version and information',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      <NavigationHeader title="More" subtitle="Additional features and settings" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {userName && (
          <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 dark:border dark:border-gray-700 text-white rounded-2xl p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{userName}</h2>
                <p className="text-rose-100 dark:text-gray-300">{userEmail}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                {section.title}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else if ('id' in item) {
                        onNavigateToSubScreen(item.id);
                      }
                    }}
                    className="w-full px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left flex items-center space-x-4 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-900 transition-colors">
                      <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onSignOut}
          className="w-full mt-8 px-6 py-4 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-2xl font-semibold hover:bg-red-100 dark:hover:bg-red-800 transition-colors flex items-center justify-center space-x-2 border border-red-200 dark:border-red-700"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
