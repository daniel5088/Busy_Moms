import { useState, useEffect } from 'react';
import { useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/forms/AuthForm';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { ImprovedNavigation } from './components/ImprovedNavigation';
import { FamilyHub } from './components/FamilyHub';
import { MoreMenu } from './components/MoreMenu';
import { Calendar } from './components/Calendar';
import { Contacts } from './components/Contacts';
import { Shopping } from './components/Shopping';
import { Tasks } from './components/Tasks';
import { Settings } from './components/Settings';
import { AIVoiceChat } from './components/AIVoiceChat';
import { FamilyFolders } from './components/FamilyFolders';
import { OAuthDiagnostics } from './components/OAuthDiagnostics';
import { AffirmationNotification } from './components/AffirmationNotification';
import { DailyAffirmations } from './components/DailyAffirmations';
//Alvaros - Dailyaffirmations: Import AffirmationSettings for unified settings modal
import { AffirmationSettings } from './components/AffirmationSettings';
import { NotificationSettings } from './components/NotificationSettings';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary, FeatureErrorBoundary } from './components/errors/ErrorBoundary';
import { ToastContainer } from './components/errors/ErrorToast';
import { useToast } from './hooks/useErrorHandler';
import { useAffirmationNotifier } from './hooks/useAffirmationNotifier';
import { useNotificationManager } from './hooks/useNotificationManager';
import { captureAndStoreGoogleTokens } from './services/googleTokenStorage';
import { Diagnostics } from './pages/Diagnostics';
import { QuickLinks } from './components/QuickLinks'; // Alvaro-quicklinks: Import QuickLinks component
import { useDarkMode } from './hooks/useDarkMode';
import CycleTracker from './components/CycleTracker';
import { LifeReceipts } from './components/LifeReceipts';
import { LifeReceiptsView } from './components/LifeReceiptsView';
import GiftFinder from './components/GiftFinder';

export type Screen =
  | 'dashboard'
  | 'dashboard-v4'
  | 'calendar'
  | 'calendar-camera'
  | 'family'
  | 'more';
export type SubScreen =
  | 'shopping'
  | 'tasks'
  | 'contacts'
  | 'family-folders'
  | 'settings'
  | 'quick-links'
  | 'wellness'
  | 'life-receipts'
  | 'life-receipts-view'
  | 'gift-finder';

function App() {
  const session = useSessionContext();
  const supabaseClient = useSupabaseClient();
  const { user, loading, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard-v4');
  const [currentSubScreen, setCurrentSubScreen] = useState<SubScreen | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [showAffirmations, setShowAffirmations] = useState(false);
  //Alvaros - Dailyaffirmations: State for unified affirmation settings modal
  const [showAffirmationSettings, setShowAffirmationSettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [openCalendarCamera, setOpenCalendarCamera] = useState(false);
  const [openRecipesTab, setOpenRecipesTab] = useState(false);
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [scrollToGoogleCalendar, setScrollToGoogleCalendar] = useState(false);
  const [openAboutDialog, setOpenAboutDialog] = useState(false);
  const [autoStartCalendarTutorial, setAutoStartCalendarTutorial] = useState(false);
  const [autoStartFamilyTutorial, setAutoStartFamilyTutorial] = useState(false);
  const { toasts, removeToast } = useToast();
  const { pendingAffirmation, settings: affirmationSettings, dismissNotification, reloadSettings } = useAffirmationNotifier();
  const notificationManager = useNotificationManager();
  const { darkMode, toggleDarkMode } = useDarkMode();

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const showDiagnostics = urlParams.get('diagnostics') === 'true';
  const forceSignOut = urlParams.get('signout') === 'true';
  const showEdgeDiagnostics = urlParams.get('edgeDiagnostics') === 'true';

  // Handle force sign-out if requested
  useEffect(() => {
    if (forceSignOut && user) {
      console.log('🔓 Force sign-out requested');
      signOut().then(() => {
        window.location.href = window.location.pathname;
      });
    }
  }, [forceSignOut, user]);

  // Reset auto-start flags after they're used
  useEffect(() => {
    if (currentScreen === 'calendar' && autoStartCalendarTutorial) {
      setTimeout(() => setAutoStartCalendarTutorial(false), 1000);
    }
    if (currentScreen === 'family' && autoStartFamilyTutorial) {
      setTimeout(() => setAutoStartFamilyTutorial(false), 1000);
    }
  }, [currentScreen, autoStartCalendarTutorial, autoStartFamilyTutorial]);

  // Show edge diagnostics page if requested
  if (showEdgeDiagnostics) {
    return <Diagnostics />;
  }

  // Show diagnostics page if requested
  if (showDiagnostics) {
    return <OAuthDiagnostics />;
  }

  // Handle OAuth callback and errors
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashParams = hash ? new URLSearchParams(hash.substring(1)) : null;

      // Check for OAuth error in URL or hash
      const error = urlParams.get('error') || hashParams?.get('error');
      const errorCode = urlParams.get('error_code') || hashParams?.get('error_code');
      const errorDescription =
        urlParams.get('error_description') || hashParams?.get('error_description');

      // Check if this is an OAuth callback (has code or access_token)
      const authCode = urlParams.get('code');
      const accessToken = hashParams?.get('access_token');

      if (error) {
        // Log comprehensive error details
        const errorDetails = {
          error,
          error_code: errorCode,
          error_description: errorDescription,
          full_url: window.location.href,
          search_params: Object.fromEntries(urlParams.entries()),
          hash_params: hashParams ? Object.fromEntries(hashParams.entries()) : null,
        };

        console.error('❌ OAuth error:', errorDetails);
        console.error('Full error object:', JSON.stringify(errorDetails, null, 2));

        // Provide user-friendly error messages
        let userMessage = 'Google sign-in failed';

        if (
          error === 'server_error' &&
          errorDescription?.includes('Unable to exchange external code')
        ) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR-PROJECT-REF.supabase.co';
          userMessage =
            `Google sign-in configuration error. Please check:\n\n` +
            `1. In Supabase Dashboard (Authentication > Providers > Google):\n` +
            `   - Google OAuth is enabled\n` +
            `   - Client ID and Secret have NO extra spaces\n\n` +
            `2. In Google Cloud Console (APIs & Credentials):\n` +
            `   - Authorized redirect URI:\n` +
            `     ${supabaseUrl}/auth/v1/callback\n` +
            `   - Authorized JavaScript origin:\n` +
            `     ${window.location.origin}\n\n` +
            `3. Google Calendar API is enabled in your Google Cloud project\n\n` +
            `Error: ${errorDescription || error}`;
        } else if (errorDescription) {
          userMessage = `Google sign-in failed:\n\n${errorDescription}\n\nPlease check your OAuth configuration.`;
        } else {
          userMessage = `Google sign-in failed: ${error}\n\nCheck the console for more details.`;
        }

        alert(userMessage);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authCode || accessToken) {
        // This is an OAuth callback - clean up URL immediately to prevent stale session warnings
        const cleanUrl = () => {
          if (
            window.location.search.includes('code=') ||
            window.location.hash.includes('access_token')
          ) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        };

        // Clean up URL after a brief delay to allow Supabase to process
        const cleanupTimer = setTimeout(cleanUrl, 500);

        // Capture Google provider tokens from the OAuth callback (fire-and-forget)
        supabaseClient.auth.getSession().then(({ data: { session }, error }) => {
          if (!error && session?.provider_token && session?.provider_refresh_token) {
            captureAndStoreGoogleTokens(session).catch((e) => {
              console.error('❌ Error capturing Google tokens:', e);
            });
          }
        });

        return () => clearTimeout(cleanupTimer);
      }
    };

    handleOAuthCallback();
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkOnboarding = async () => {
      // Only check onboarding if we have an authenticated user
      if (!user?.id) return;

      setCheckingOnboarding(true);
      try {
        // Check the actual profile in the database
        const { data: profile, error } = await supabaseClient
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (!mounted) return;

        if (!error && profile) {
          setShowOnboarding(!profile.onboarding_completed);
        } else {
          // If no profile exists or error, show onboarding
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        if (!mounted) return;
        // If no profile exists or error, show onboarding
        setShowOnboarding(true);
      } finally {
        if (mounted) setCheckingOnboarding(false);
      }
    };

    if (user?.id) {
      checkOnboarding();
    } else {
      // No user, don't show onboarding
      setShowOnboarding(false);
      setCheckingOnboarding(false);
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  //Alvaros - Dailyaffirmations: Listen for 'open-affirmations' event from Settings and MoreMenu
  useEffect(() => {
    const handleOpenAffirmations = () => {
      setShowAffirmationSettings(true);
    };

    window.addEventListener('open-affirmations', handleOpenAffirmations);

    return () => {
      window.removeEventListener('open-affirmations', handleOpenAffirmations);
    };
  }, []);

  // Listen for 'open-notifications' event from MoreMenu
  useEffect(() => {
    const handleOpenNotifications = () => {
      setShowNotificationSettings(true);
    };

    window.addEventListener('open-notifications', handleOpenNotifications);

    return () => {
      window.removeEventListener('open-notifications', handleOpenNotifications);
    };
  }, []);

  // Listen for 'open-about-dialog' event from Settings
  useEffect(() => {
    const handleOpenAboutDialog = () => {
      setCurrentScreen('dashboard-v4');
      setCurrentSubScreen(null);
      setOpenAboutDialog(true);
    };

    window.addEventListener('open-about-dialog', handleOpenAboutDialog);

    return () => {
      window.removeEventListener('open-about-dialog', handleOpenAboutDialog);
    };
  }, []);

  // Reset scroll to Google Calendar flag when subscreen changes
  useEffect(() => {
    if (currentSubScreen !== 'settings') {
      setScrollToGoogleCalendar(false);
    }
  }, [currentSubScreen]);

  // Show loading only when we're checking auth or onboarding for authenticated users
  if (loading || (user && checkingOnboarding)) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
            <p className="text-gray-600 dark:text-gray-300">
              {loading
                ? 'Loading...'
                : checkingOnboarding
                  ? 'Checking your profile...'
                  : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Global modals available during all app states */}
        <AffirmationSettings
          isOpen={showAffirmationSettings}
          onClose={() => setShowAffirmationSettings(false)}
          onSettingsChanged={reloadSettings}
        />

        {showNotificationSettings && (
          <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
        )}
      </>
    );
  }

  // Show sign-in form if no user is authenticated
  if (!user) {
    console.log('🔐 No user authenticated, showing sign-in form');
    return (
      <>
        <AuthForm
          onAuthSuccess={() => {
            console.log('✅ Auth success callback triggered');
            // The useEffect will handle checking onboarding status
          }}
        />

        {/* Global modals available during all app states */}
        <AffirmationSettings
          isOpen={showAffirmationSettings}
          onClose={() => setShowAffirmationSettings(false)}
          onSettingsChanged={reloadSettings}
        />

        {showNotificationSettings && (
          <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
        )}
      </>
    );
  }

  // Show onboarding if user exists but hasn't completed onboarding
  if (showOnboarding) {
    return (
      <>
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />

        {/* Global modals available during all app states */}
        <AffirmationSettings
          isOpen={showAffirmationSettings}
          onClose={() => setShowAffirmationSettings(false)}
          onSettingsChanged={reloadSettings}
        />

        {showNotificationSettings && (
          <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
        )}
      </>
    );
  }
  // Show main app if user is authenticated and has completed onboarding
  return (
    <ErrorBoundary componentName="App">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <ImprovedNavigation
          currentScreen={currentScreen}
          onScreenChange={(screen) => {
            setCurrentScreen(screen);
            setCurrentSubScreen(null);
          }}
          onSignOut={signOut}
          onVoiceChatOpen={() => setShowVoiceChat(true)}
        />
        <main className="pb-20">
          {currentSubScreen ? (
            <>
              {currentSubScreen === 'shopping' && (
                <FeatureErrorBoundary featureName="Shopping">
                  <Shopping
                    openRecipesTab={openRecipesTab}
                    onRecipesTabOpened={() => setOpenRecipesTab(false)}
                  />
                </FeatureErrorBoundary>
              )}
              {currentSubScreen === 'tasks' && (
                <FeatureErrorBoundary featureName="Tasks">
                  <Tasks />
                </FeatureErrorBoundary>
              )}
              {currentSubScreen === 'contacts' && (
                <FeatureErrorBoundary featureName="Contacts">
                  <Contacts />
                </FeatureErrorBoundary>
              )}
              {currentSubScreen === 'family-folders' && (
                <FeatureErrorBoundary featureName="Family Folders">
                  <FamilyFolders />
                </FeatureErrorBoundary>
              )}
              {currentSubScreen === 'settings' && (
                <FeatureErrorBoundary featureName="Settings">
                  <Settings
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    scrollToGoogleCalendar={scrollToGoogleCalendar}
                    onNavigateToScreen={(screen) => {
                      setCurrentSubScreen(null);
                      setCurrentScreen(screen);
                    }}
                  />
                </FeatureErrorBoundary>
              )}
              {/* Alvaro-quicklinks: Add Quick Links subscreen routing */}
              {currentSubScreen === 'quick-links' && (
                <FeatureErrorBoundary featureName="Quick Links">
                  <QuickLinks />
                </FeatureErrorBoundary>
              )}
              {currentSubScreen === 'wellness' && (
                <FeatureErrorBoundary featureName="Wellness">
                  <CycleTracker />
                </FeatureErrorBoundary>
              )}
              {currentSubScreen === 'life-receipts' && (
                <FeatureErrorBoundary featureName="Life Receipts">
                  <LifeReceipts onNavigateToView={() => setCurrentSubScreen('life-receipts-view')} />
                </FeatureErrorBoundary>
              )}
              {currentSubScreen === 'life-receipts-view' && (
                <FeatureErrorBoundary featureName="Life Receipts View">
                  <LifeReceiptsView onBack={() => setCurrentSubScreen('life-receipts')} />
                </FeatureErrorBoundary>
              )}
              {currentSubScreen === 'gift-finder' && (
                <FeatureErrorBoundary featureName="Gift Finder">
                  <GiftFinder onBack={() => setCurrentSubScreen(null)} />
                </FeatureErrorBoundary>
              )}
            </>
          ) : (
            <>
              {(currentScreen === 'dashboard' || currentScreen === 'dashboard-v4') && (
                <FeatureErrorBoundary featureName="Dashboard">
                  <Dashboard
                    onNavigate={(screen) => {
                      if (screen === 'calendar') {
                        setAutoStartCalendarTutorial(true);
                      }
                      setCurrentScreen(screen);
                    }}
                    onNavigateToSubScreen={setCurrentSubScreen}
                    onVoiceChatOpen={() => setShowVoiceChat(true)}
                    onOpenAffirmationSettings={() => setShowAffirmationSettings(true)}
                    onNavigateToCalendarCamera={() => {
                      setCurrentScreen('calendar');
                      setOpenCalendarCamera(true);
                    }}
                    onNavigateToWellness={() => {
                      setCurrentSubScreen('wellness');
                    }}
                    onNavigateToRecipes={() => {
                      setCurrentSubScreen('shopping');
                      setOpenRecipesTab(true);
                    }}
                    onNavigateToEvent={(eventDate: string) => {
                      setSelectedEventDate(eventDate);
                      setCurrentScreen('calendar');
                    }}
                    openAboutDialog={openAboutDialog}
                    onAboutDialogOpened={() => setOpenAboutDialog(false)}
                    affirmationSettings={affirmationSettings}
                  />
                </FeatureErrorBoundary>
              )}
              {currentScreen === 'calendar' && (
                <FeatureErrorBoundary featureName="Calendar">
                  <Calendar
                    onNavigateToSubScreen={setCurrentSubScreen}
                    onNavigateToGiftFinder={() => {
                      setCurrentSubScreen('gift-finder');
                    }}
                    openCalendarCamera={openCalendarCamera}
                    onCalendarCameraOpened={() => setOpenCalendarCamera(false)}
                    initialSelectedDate={selectedEventDate}
                    onDateSelected={() => setSelectedEventDate(null)}
                    onNavigateToGoogleCalendarSettings={() => {
                      setScrollToGoogleCalendar(true);
                      setCurrentSubScreen('settings');
                    }}
                    onNavigate={(screen) => {
                      if (screen === 'family') {
                        setAutoStartFamilyTutorial(true);
                      }
                      setCurrentScreen(screen);
                    }}
                    autoStartTutorial={autoStartCalendarTutorial}
                  />
                </FeatureErrorBoundary>
              )}
              {currentScreen === 'calendar-camera' && (
                <FeatureErrorBoundary featureName="Calendar Camera">
                  <CalendarCamera />
                </FeatureErrorBoundary>
              )}
              {currentScreen === 'family' && (
                <FeatureErrorBoundary featureName="Family Hub">
                  <FamilyHub
                    onNavigateToSubScreen={setCurrentSubScreen}
                    onNavigateToScreen={setCurrentScreen}
                    autoStartTutorial={autoStartFamilyTutorial}
                    onOpenVoiceChat={() => setShowVoiceChat(true)}
                  />
                </FeatureErrorBoundary>
              )}
              {currentScreen === 'more' && (
                <FeatureErrorBoundary featureName="More Menu">
                  <MoreMenu
                    onNavigateToSubScreen={setCurrentSubScreen}
                    onSignOut={signOut}
                    userName={
                      user?.user_metadata?.full_name ||
                      user?.user_metadata?.name ||
                      user?.email?.split('@')[0]
                    }
                    userEmail={user?.email}
                  />
                </FeatureErrorBoundary>
              )}
            </>
          )}
        </main>

        <AIVoiceChat isOpen={showVoiceChat} onClose={() => setShowVoiceChat(false)} />

        <AffirmationNotification
          affirmation={pendingAffirmation}
          onDismiss={dismissNotification}
          onView={() => {
            dismissNotification();
            setShowAffirmations(true);
          }}
        />

        <DailyAffirmations
          isOpen={showAffirmations}
          onClose={() => setShowAffirmations(false)}
          onOpenVoiceChat={() => setShowVoiceChat(true)}
          externalSettingsEnabled={affirmationSettings?.enabled}
        />

        {/*Alvaros - Dailyaffirmations: Unified settings modal accessible from all app states (rendered before early returns)*/}
        <AffirmationSettings
          isOpen={showAffirmationSettings}
          onClose={() => setShowAffirmationSettings(false)}
          onSettingsChanged={reloadSettings}
        />

        {showNotificationSettings && (
          <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
