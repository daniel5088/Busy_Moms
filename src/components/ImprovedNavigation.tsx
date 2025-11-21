import React from 'react';
import { Home, Calendar, Users, Menu, MessageCircle } from 'lucide-react';
import { Screen } from '../App';

// Alvaros onlykeyboard - Added keyboard focus styling to navigation tabs
// Alvaros 44x44 - Updated touch targets to meet 44x44 minimum accessibility standard

interface NavigationProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
  onSignOut: () => void;
  onVoiceChatOpen?: () => void;
}

export function ImprovedNavigation({ currentScreen, onScreenChange, onVoiceChatOpen }: NavigationProps) {
  const navItems = [
    { id: 'dashboard' as Screen, icon: Home, label: 'Home' },
    { id: 'calendar' as Screen, icon: Calendar, label: 'Calendar' },
    { id: 'family' as Screen, icon: Users, label: 'Family' },
    { id: 'more' as Screen, icon: Menu, label: 'More' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb shadow-lg">
      <div className="flex items-center justify-around py-2 px-2 relative max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onScreenChange(item.id)}
            className={`flex flex-col items-center justify-center space-y-0.5 py-2 px-3 rounded-xl transition-all min-w-[44px] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${
              currentScreen === item.id
                ? 'text-rose-600 bg-rose-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            aria-label={item.label}
            aria-current={currentScreen === item.id ? 'page' : undefined}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}

        {onVoiceChatOpen && (
          <button
            onClick={onVoiceChatOpen}
            className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rose-400"
            title="AI Voice Assistant"
            aria-label="Open AI Voice Assistant"
          >
            <MessageCircle className="w-7 h-7" />
          </button>
        )}
      </div>
    </nav>
  );
}