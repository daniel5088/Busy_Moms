//Alvaro-dashboardv3: Dashboard V3 minimal prototype - static content only
import React, { useState } from 'react';
import {
  Calendar,
  ShoppingBag,
  MessageCircle,
  Clock,
  Heart,
  Users,
  Sparkles,
  X,
} from 'lucide-react';
import { SubScreen } from '../App';

interface DashboardProps {
  onNavigate: (screen: 'calendar' | 'family' | 'more') => void;
  onNavigateToSubScreen: (screen: SubScreen) => void;
  onVoiceChatOpen?: () => void;
}

export function DashboardV3Experimental({
  onNavigate,
  onNavigateToSubScreen,
  onVoiceChatOpen,
}: DashboardProps) {
  //Alvaro-dashboardv3: State to control top-anchored affirmation popup
  const [showAffirmationPopup, setShowAffirmationPopup] = useState(true);

  // Mock affirmation text - static content for prototype
  const mockAffirmation =
    'You are capable of amazing things today. Trust yourself and embrace every moment with confidence.';

  //Alvaro-dashboardv3: Mock stats data for prototype demonstration
  const mockStats = {
    events: 0,
    shoppingItems: 4,
    reminders: 0,
  };

  //Alvaro-dashboardv3: 3x2 Quick Actions grid with 4 real + 2 placeholder actions
  const quickActions = [
    // Row 1 - 3 real actions
    {
      icon: Calendar,
      title: 'View Calendar',
      desc: 'See all your events',
      bgColor: 'bg-rose-50 dark:bg-gray-800',
      borderColor: 'border-rose-200 dark:border-gray-700',
      iconBgColor: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-rose-100 dark:hover:bg-gray-700',
      action: () => onNavigate('calendar'),
    },
    {
      icon: ShoppingBag,
      title: 'Shopping List',
      desc: 'Manage your items',
      bgColor: 'bg-amber-50 dark:bg-gray-800',
      borderColor: 'border-amber-200 dark:border-gray-700',
      iconBgColor: 'bg-amber-100 dark:bg-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-amber-100 dark:hover:bg-gray-700',
      action: () => onNavigateToSubScreen('shopping'),
    },
    {
      icon: Users,
      title: 'Family Hub',
      desc: 'Organize by member',
      bgColor: 'bg-blue-50 dark:bg-gray-800',
      borderColor: 'border-blue-200 dark:border-gray-700',
      iconBgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-gray-700',
      action: () => onNavigate('family'),
    },
    // Row 2 - 1 real action + 2 placeholders
    {
      icon: MessageCircle,
      title: 'AI Assistant',
      desc: 'Get help with anything',
      bgColor: 'bg-pink-50 dark:bg-gray-800',
      borderColor: 'border-pink-200 dark:border-gray-700',
      iconBgColor: 'bg-pink-100 dark:bg-pink-900',
      iconColor: 'text-pink-600 dark:text-pink-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-pink-100 dark:hover:bg-gray-700',
      action: () => onVoiceChatOpen?.(),
    },
    {
      icon: Clock,
      title: 'Coming Soon',
      desc: 'More features ahead',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      iconBgColor: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-400 dark:text-gray-500',
      textColor: 'text-gray-500 dark:text-gray-400',
      descColor: 'text-gray-400 dark:text-gray-500',
      hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-750',
      action: () => {}, // Empty handler for placeholder
    },
    {
      icon: Sparkles,
      title: 'Coming Soon',
      desc: 'Stay tuned',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      iconBgColor: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-400 dark:text-gray-500',
      textColor: 'text-gray-500 dark:text-gray-400',
      descColor: 'text-gray-400 dark:text-gray-500',
      hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-750',
      action: () => {}, // Empty handler for placeholder
    },
  ];

  return (
    <>
      {/* Alvaro-dashboardv3: Top-anchored affirmation popup (not full-screen, no blur) */}
      {showAffirmationPopup && (
        <div
          className="fixed left-0 right-0 top-0 z-40 flex justify-center px-4 pt-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="affirmation-popup-title"
        >
          <div className="w-full max-w-2xl bg-gradient-to-br from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 dark:border dark:border-rose-500 p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-white" />
                <span id="affirmation-popup-title" className="text-white font-semibold text-sm">
                  Today's Affirmation
                </span>
              </div>

              <p className="text-white text-lg sm:text-xl leading-relaxed mb-4">
                {mockAffirmation}
              </p>

              {/* Close button at bottom */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAffirmationPopup(false)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors flex items-center space-x-2"
                  aria-label="Close affirmation"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Good Morning Hero Header */}
        <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white p-4 pb-6 dark:border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Good Morning Awesome, User!</h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>

          {/* Alvaro-dashboardv3: Daily summary stats chips (copied from Dashboard V2) */}
          <div className="bg-white bg-opacity-10 dark:bg-gray-900 dark:bg-opacity-50 rounded-xl p-3">
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
              <button
                onClick={() => onNavigate('calendar')}
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{mockStats.events} events</span>
              </button>
              <button
                onClick={() => onNavigateToSubScreen('shopping')}
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
              >
                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{mockStats.shoppingItems} shopping list</span>
              </button>
              <button
                onClick={() => onNavigateToSubScreen('tasks')}
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{mockStats.reminders} reminders</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 space-y-4 sm:p-6 sm:space-y-6">
          {/* Alvaro-dashboardv3: Sarah Assistant at top of layout */}
          <div
            className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-4 sm:p-6 rounded-xl border border-rose-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all"
            onClick={() => onVoiceChatOpen?.()}
          >
            <div className="flex items-center space-x-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                  Sarah - Your Voice Assistant
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Talk to me anytime!
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-lg shadow-sm">
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                "Hey Sarah, what can you help me with today?"
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVoiceChatOpen?.();
                  }}
                  className="px-2 py-1 sm:px-3 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full text-xs sm:text-sm hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors"
                >
                  Add reminder for tomorrow
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVoiceChatOpen?.();
                  }}
                  className="px-2 py-1 sm:px-3 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full text-xs sm:text-sm hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors"
                >
                  Schedule dentist appointment
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVoiceChatOpen?.();
                  }}
                  className="px-2 py-1 sm:px-3 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full text-xs sm:text-sm hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors"
                >
                  Add milk to shopping list
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid - 3 columns × 2 rows */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`p-3 sm:p-4 rounded-xl ${action.bgColor} border ${action.borderColor} shadow-sm text-left
                    transition-all duration-200 ease-in-out
                    ${action.hoverBg} hover:shadow-md hover:border-opacity-80
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
                  aria-label={`${action.title}: ${action.desc}`}
                >
                  <div
                    className={`${action.iconBgColor} p-2 sm:p-3 rounded-xl mb-2 sm:mb-3 inline-block`}
                  >
                    <action.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${action.iconColor}`} />
                  </div>
                  <h3 className={`font-semibold ${action.textColor} mb-1 text-sm sm:text-base`}>
                    {action.title}
                  </h3>
                  <p className={`text-xs sm:text-sm ${action.descColor}`}>{action.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
