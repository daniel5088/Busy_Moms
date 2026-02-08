import { useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react';
import { getOAuthConfig } from '../lib/auth-config';
import { captureAndStoreGoogleTokens } from '../services/googleTokenStorage';

export function useAuth() {
  const session = useSessionContext();
  const supabase = useSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let processingProfile = false;
    let initialSessionHandled = false;

    // Track which user IDs we've already processed to prevent duplicates
    const processedUserIds = new Set<string>();

    // Handle user profile with deduplication
    const safeHandleUserProfile = async (user: User, event: string) => {
      // Prevent duplicate processing
      if (processingProfile || processedUserIds.has(user.id)) {
        return;
      }

      processingProfile = true;
      processedUserIds.add(user.id);

      try {
        await handleUserProfile(user);
      } catch (e) {
        console.error('Profile init error:', e);
      } finally {
        processingProfile = false;
      }
    };

    // Only update user state once session context is ready
    if (!isInitialized && session !== undefined) {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
      setIsInitialized(true);
    }

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!mounted) return;

      setUser(authSession?.user ?? null);
      setLoading(false);

      if (authSession?.user) {
        // Only handle INITIAL_SESSION once
        if (event === 'INITIAL_SESSION') {
          if (initialSessionHandled) return;
          initialSessionHandled = true;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          // Fire-and-forget with deduplication
          safeHandleUserProfile(authSession.user, event);

          // Capture Google provider tokens if this is a Google OAuth sign-in
          if (event === 'SIGNED_IN' && authSession.provider_token) {
            captureAndStoreGoogleTokens(authSession).catch((e) =>
              console.error('❌ Failed to capture Google tokens:', e)
            );
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [session, supabase, isInitialized]);

  const handleUserProfile = async (user: User) => {
    try {
      console.log('👤 Checking profile for user:', user.id);
      
      // Check if profile exists
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      // Ignore "no rows" code (PGRST116)
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Profile check error:', checkError);
        return;
      }

      if (!existing) {
        console.log('⚠️ Profile not found, creating...');
        
        const profileData = {
          id: user.id,
          email: user.email ?? '',
          full_name:
            (user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email?.split('@')[0]) ||
            'User',
          user_type: 'Mom' as const,
          onboarding_completed: false,
          ai_personality: 'Friendly' as const,
          dark_mode: null,
        };

        const { error: createError } = await supabase.from('profiles').insert([profileData]);
        
        if (createError) {
          console.error('❌ Profile create error:', createError);
        } else {
          console.log('✅ Profile created successfully');
        }
      } else {
        console.log('✅ Profile already exists');
      }

      // IMPORTANT: Also check/create users table record for your app
      // This ensures compatibility with both tables
      await ensureUsersTableRecord(user);
      
    } catch (error) {
      console.error('❌ Profile handling error (database may be unavailable):', error);
    }
  };

  /**
   * Ensures a record exists in the users table (in addition to profiles)
   * This provides compatibility with other parts of your app that use the users table
   */
  const ensureUsersTableRecord = async (user: User) => {
    try {
      console.log('👤 Checking users table for:', user.id);
      
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      // Ignore "no rows" code (PGRST116)
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('⚠️ Users table check error (table may not exist):', checkError);
        return; // Don't fail if users table doesn't exist
      }

      if (!existingUser) {
        console.log('⚠️ User record not found in users table, creating...');
        
        const userData = {
          id: user.id,
          uuid: user.id,
          email: user.email ?? '',
          full_name:
            (user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email?.split('@')[0]) ||
            'User',
          user_type: user.user_metadata?.user_type || 'Dad',
          ai_personality: user.user_metadata?.ai_personality || 'Friendly',
          onboarding_completed: user.user_metadata?.onboarding_completed || false,
        };

        const { error: insertError } = await supabase.from('users').insert([userData]);
        
        if (insertError) {
          console.error('⚠️ Failed to create users table record:', insertError);
          // Don't throw - this is a fallback, not critical
        } else {
          console.log('✅ Users table record created successfully');
        }
      } else {
        console.log('✅ Users table record already exists');
      }
    } catch (error) {
      console.warn('⚠️ Could not verify/create users table record:', error);
      // Don't throw - this is best-effort
    }
  };

  /**
   * Enhanced sign up with better error handling and profile creation
   */
  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    try {
      console.log('🔐 Starting signup for:', email);

      // Validate inputs
      if (!email || !password) {
        const error = new Error('Email and password are required');
        console.error('❌ Validation error:', error.message);
        return { data: null, error };
      }

      if (password.length < 6) {
        const error = new Error('Password must be at least 6 characters');
        console.error('❌ Validation error:', error.message);
        return { data: null, error };
      }

      // Attempt signup with metadata
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Check if it's the database trigger error
        if (error.message && error.message.includes('Database error saving new user')) {
          console.error('❌ Database trigger error - please run FIX_SIGNUP_ERROR.sql');
          console.error('   This is caused by a problematic database trigger that needs to be removed.');
          console.error('   See FIX_SIGNUP_ERROR.sql in the project root for the fix.');
        }
        console.error('❌ Sign-up error:', error.message);
        return { data: null, error };
      }

      if (!data.user) {
        const error = new Error('Failed to create user account');
        console.error('❌ No user returned:', error.message);
        return { data: null, error };
      }

      console.log('✅ Auth user created:', data.user.id);

      // Give the database trigger a moment to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify/create profile record (fallback if trigger didn't work)
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          console.log('⚠️ Profile not created by trigger, creating manually...');
          
          const profileData = {
            id: data.user.id,
            email: email,
            full_name: metadata?.full_name || email.split('@')[0] || 'User',
            user_type: 'Mom' as const,
            onboarding_completed: false,
            ai_personality: 'Friendly' as const,
            dark_mode: null,
          };

          await supabase.from('profiles').insert([profileData]);
          console.log('✅ Profile created manually');
        }
      } catch (profileError) {
        console.warn('⚠️ Could not verify/create profile:', profileError);
      }

      // Also ensure users table record exists (if your app uses it)
      if (data.user) {
        try {
          await ensureUsersTableRecord(data.user);
        } catch (usersError) {
          console.warn('⚠️ Could not verify/create users table record:', usersError);
        }
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('❌ Unexpected sign-up error:', err);
      return { data: null, error: err };
    }
  };

  /**
   * Sign in with enhanced profile verification
   */
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        console.error('❌ Sign-in error:', error.message);
        return { data: null, error };
      }

      if (!data.user) {
        const error = new Error('Failed to sign in');
        console.error('❌ No user returned:', error.message);
        return { data: null, error };
      }

      console.log('✅ Sign in successful:', data.user.id);

      // Ensure profile exists (for users who signed up before the fix)
      if (data.user) {
        // Fire and forget - don't block sign in
        handleUserProfile(data.user).catch(e => 
          console.warn('⚠️ Could not verify profile on sign in:', e)
        );
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('❌ Unexpected sign-in error:', err);
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    console.log('🔐 Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Sign-out error:', error.message);
    } else {
      console.log('✅ Sign out successful');
    }
    return { error };
  };

  const signInWithGoogle = async () => {
    console.log('🔐 Initiating Google OAuth with config:', getOAuthConfig());

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: getOAuthConfig(),
    });

    if (error) {
      console.error('❌ Google sign-in error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        full_error: error,
      });
    } else {
      console.log('🚀 Google OAuth initiated successfully');
      console.log('OAuth data:', data);
    }
    return { data, error };
  };

  return { user, loading, signUp, signIn, signOut, signInWithGoogle };
}