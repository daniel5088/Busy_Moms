import React, { useState } from 'react';
import { Mail, Lock, User, Chrome, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    otp: '',
    newPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        console.log('🔐 Starting signup process for:', formData.email);
        
        // Validate inputs
        if (!formData.email || !formData.password) {
          throw new Error('Email and password are required');
        }
        
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        // Attempt signup
        const { data, error: signUpError } = await signUp(formData.email, formData.password, {
          full_name: formData.fullName || '',
        });

        if (signUpError) {
          console.error('❌ Signup error:', signUpError);
          
          // Handle specific error cases
          if (signUpError.message.includes('User already registered')) {
            setError('This email is already registered. Please sign in instead.');
            setIsSignUp(false);
            return;
          }
          
          if (signUpError.message.includes('Database error')) {
            setError('Account creation failed. Please contact support or try again later.');
            console.error('Database error details:', signUpError);
            return;
          }
          
          throw signUpError;
        }

        if (!data?.user) {
          throw new Error('Failed to create user account');
        }

        console.log('✅ User created successfully:', data.user.id);

        // Check if email confirmation is required
        if (data.user && !data.session) {
          setError('Please check your email to confirm your account before signing in.');
          setIsSignUp(false);
          return;
        }

        // Verify user record was created in users table
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (userError && userError.code === 'PGRST116') {
            // User doesn't exist in users table, create it manually
            console.log('⚠️ User not found in users table, creating manually...');
            
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                uuid: data.user.id,
                email: formData.email,
                full_name: formData.fullName || '',
                user_type: 'Dad',
                ai_personality: 'Friendly',
                onboarding_completed: false,
              });

            if (insertError) {
              console.error('❌ Failed to create user record:', insertError);
              // Don't fail the signup completely, they can still sign in
              setError('Account created but profile setup incomplete. You can still sign in and complete your profile.');
            } else {
              console.log('✅ User record created manually');
            }
          }
        } catch (fallbackError) {
          console.warn('⚠️ Fallback user creation check failed:', fallbackError);
        }

        // Success! Proceed to onboarding
        console.log('✅ Signup complete, proceeding to onboarding');
        onAuthSuccess();

      } else {
        // Sign In
        console.log('🔐 Starting sign in for:', formData.email);
        const { error: signInError } = await signIn(formData.email, formData.password);
        
        if (signInError) {
          console.error('❌ Sign in error:', signInError);
          
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please try again.');
          }
          
          throw signInError;
        }
        
        console.log('✅ Sign in successful');
        onAuthSuccess();
      }
    } catch (error: any) {
      console.error('❌ Auth error:', error);
      setError(error.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('🔐 Google sign-in button clicked');
    setGoogleLoading(true);
    setError(null);
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('❌ Google sign-in error:', error);
        setError('Google sign-in failed. Please check your network connection and try again.');
        setGoogleLoading(false);
        return;
      }
      console.log('🚀 Google OAuth redirect initiated...');
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      setError('Google sign-in is not available. Please use email/password instead.');
      setGoogleLoading(false);
    }
  };

  const handleSendPasswordResetOTP = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: undefined,
          data: {
            purpose: 'password_reset'
          }
        },
      });

      if (error) throw error;

      setOtpSent(true);
      setError('Password reset code sent! Check your email for the 6-digit code.');
    } catch (error: any) {
      setError(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.otp || formData.otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (!formData.newPassword || formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.otp,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) throw updateError;

      setError('Password updated successfully! You can now sign in.');
      
      setTimeout(() => {
        setShowForgotPassword(false);
        setOtpSent(false);
        setFormData({ ...formData, otp: '', newPassword: '' });
        setError(null);
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md p-4 sm:p-8">
        <header className="text-center mb-8">
          <img src="/bmalogo.png" alt="Busy Moms App" className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {showForgotPassword 
              ? (otpSent ? 'Reset Your Password' : 'Forgot Password') 
              : isSignUp 
                ? 'Join Busy Moms' 
                : 'Welcome Back'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {showForgotPassword 
              ? (otpSent ? 'Enter the code and your new password' : 'Enter your email to receive a verification code') 
              : isSignUp 
                ? 'Create your account to get started' 
                : 'Sign in to your account'}
          </p>
        </header>

        {/* Error Message Display */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            error.includes('successfully') || error.includes('sent')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {error}
          </div>
        )}

        <main>
          {showForgotPassword ? (
            <div className="space-y-3 sm:space-y-4">
              {!otpSent ? (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="your@email.com"
                    />
                  </div>

                  <button
                    onClick={handleSendPasswordResetOTP}
                    disabled={loading}
                    className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      6-Digit Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Sent to {formData.email}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Enter new password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || formData.otp.length !== 6}
                    className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setFormData({ ...formData, otp: '', newPassword: '' });
                      setError(null);
                    }}
                    className="w-full text-purple-600 hover:underline text-sm"
                  >
                    Use a different email
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setOtpSent(false);
                  setFormData({ ...formData, otp: '', newPassword: '' });
                  setError(null);
                }}
                className="w-full text-gray-600 hover:underline text-sm sm:text-base"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Your full name"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Your password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base"
                >
                  {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {!isSignUp && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <div className="mt-4 sm:mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs sm:text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full mt-3 sm:mt-4 flex items-center justify-center space-x-2 sm:space-x-3 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Chrome className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    {googleLoading
                      ? 'Connecting...'
                      : isSignUp
                        ? 'Sign up with Google'
                        : 'Sign in with Google'}
                  </span>
                </button>
              </div>

              <div className="mt-4 sm:mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-purple-600 hover:underline text-sm sm:text-base"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}