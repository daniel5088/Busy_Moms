import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User, Session, AuthError, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { logger } from '../utils/logger';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: AuthResponse['data'] | null; error: AuthError | Error | null }>;
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ data: AuthResponse['data'] | null; error: AuthError | Error | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ data: null; error: Error }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track processed user IDs to prevent duplicate profile creation
  const processedUserIds = new Set<string>();
  let processingProfile = false;

  /**
   * Fetch user profile from the profiles table
   */
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Profile fetch error:', error);
        return null;
      }

      return data;
    } catch (error: unknown) {
      console.error('❌ Profile fetch error:', error);
      return null;
    }
  };

  /**
   * Create a new profile for a user
   */
  const createProfile = async (user: User): Promise<Profile | null> => {
    try {
      const profileData: Partial<Profile> = {
        id: user.id,
        email: user.email ?? '',
        full_name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split('@')[0] ??
          'User',
        user_type: (user.user_metadata?.user_type as Profile['user_type']) ?? 'Mom',
        onboarding_completed: user.user_metadata?.onboarding_completed ?? false,
        ai_personality: (user.user_metadata?.ai_personality as Profile['ai_personality']) ?? 'Friendly',
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        console.error('❌ Profile create error:', error);
        return null;
      }

      logger.info('✅ Profile created successfully');
      return data;
    } catch (error: unknown) {
      console.error('❌ Profile create error:', error);
      return null;
    }
  };

  /**
   * Handle user profile - fetch or create if needed
   */
  const handleUserProfile = async (user: User) => {
    // Prevent duplicate processing
    if (processingProfile || processedUserIds.has(user.id)) {
      return;
    }

    processingProfile = true;
    processedUserIds.add(user.id);

    try {
      logger.debug('👤 Fetching profile for user:', user.id);

      // Try to fetch existing profile
      let userProfile = await fetchProfile(user.id);

      // If no profile exists, create one
      if (!userProfile) {
        logger.info('⚠️ Profile not found, creating...');
        userProfile = await createProfile(user);
      }

      if (userProfile) {
        setProfile(userProfile);
        logger.info('✅ Profile loaded:', userProfile.onboarding_completed ? 'Onboarding complete' : 'Onboarding needed');
      }
    } catch (error: unknown) {
      console.error('❌ Profile handling error:', error);
    } finally {
      processingProfile = false;
    }
  };

  /**
   * Refresh profile data from database
   */
  const refreshProfile = async () => {
    if (!user) return;

    const userProfile = await fetchProfile(user.id);
    if (userProfile) {
      setProfile(userProfile);
    }
  };

  /**
   * Initialize auth state and listen for changes
   */
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        handleUserProfile(initialSession.user);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      logger.info('🔐 Auth state changed:', event);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await handleUserProfile(newSession.user);

        // Handle Google OAuth token storage
        if (event === 'SIGNED_IN' && newSession.provider_token) {
          // Store Google tokens via edge function
          try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession?.access_token) {
              await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/store-google-tokens`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSession.access_token}`,
                    'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
                  },
                  body: JSON.stringify({
                    provider_token: newSession.provider_token,
                    provider_refresh_token: newSession.provider_refresh_token,
                  }),
                }
              );
              logger.info('✅ Google tokens stored');
            }
          } catch (error: unknown) {
            console.error('❌ Failed to store Google tokens:', error);
          }
        }
      } else {
        // User signed out
        setProfile(null);
        processedUserIds.clear();
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    try {
      logger.info('🔐 Starting signup for:', email);

      if (!email || !password) {
        return { data: null, error: new Error('Email and password are required') };
      }

      if (password.length < 6) {
        return { data: null, error: new Error('Password must be at least 6 characters') };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata?.full_name || '',
            user_type: 'Mom',
            ai_personality: 'Friendly',
            onboarding_completed: false,
          },
        },
      });

      if (error) {
        console.error('❌ Sign-up error:', error.message);
        return { data: null, error };
      }

      if (!data.user) {
        return { data: null, error: new Error('Failed to create user account') };
      }

      logger.info('✅ Auth user created:', data.user.id);

      // Give the database trigger a moment to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify/create profile (fallback if trigger didn't work)
      const existingProfile = await fetchProfile(data.user.id);
      if (!existingProfile && data.user) {
        await createProfile(data.user);
      }

      return { data, error: null };
    } catch (err: unknown) {
      console.error('❌ Unexpected sign-up error:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Unknown sign-up error') };
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      logger.info('🔐 Starting sign in for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign-in error:', error.message);
        return { data: null, error };
      }

      if (!data.user) {
        return { data: null, error: new Error('Failed to sign in') };
      }

      logger.info('✅ Sign in successful:', data.user.id);

      // Profile will be loaded by onAuthStateChange
      return { data, error: null };
    } catch (err: unknown) {
      console.error('❌ Unexpected sign-in error:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Unknown sign-in error') };
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    logger.info('🔐 Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Sign-out error:', error.message);
    } else {
      logger.info('✅ Sign out successful');
      setUser(null);
      setSession(null);
      setProfile(null);
      processedUserIds.clear();
    }
    return { error };
  };

  /**
   * Sign in with Google OAuth (placeholder - needs expo-auth-session implementation)
   */
  const signInWithGoogle = async () => {
    logger.info('🔐 Google OAuth not yet implemented in mobile');
    return {
      data: null,
      error: new Error('Google OAuth will be implemented in a later step'),
    };
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
