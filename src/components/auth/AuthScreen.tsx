import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Eye, EyeOff, Camera } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_NEXUS_AVATAR } from '../../utils/constants';
import { GotULogo } from '../common/GotULogo';

export const AuthScreen: React.FC = () => {
  const { authMode, setAuthMode, setScreen, login, signup, loginWithGoogle } = useApp();

  // Sign In state
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarPreset, setAvatarPreset] = useState<string>(DEFAULT_NEXUS_AVATAR);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatAuthError = (err: any): string => {
    if (!err) return 'An unexpected error occurred. Please try again.';
    const code = err.code || '';
    const message = typeof err === 'string' ? err : err.message || '';

    // Popup or cancellation error check
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/popup-blocked' ||
      message.includes('Pending promise') ||
      message.includes('popup') ||
      message.includes('ASSERTION')
    ) {
      return 'Google Sign-In was cancelled or popup was blocked by your browser. Please allow popups or use email sign-in.';
    }

    // Network error check
    if (
      code === 'auth/network-request-failed' ||
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('internet') ||
      message.toLowerCase().includes('offline')
    ) {
      return 'Please check your internet connection and try again.';
    }

    // Username already exists check
    if (
      message.includes('username') &&
      (message.includes('exists') || message.includes('taken') || message.includes('already'))
    ) {
      return 'This username is already exists.';
    }

    // Email already registered check
    if (
      code === 'auth/email-already-in-use' ||
      message.includes('email is already registered') ||
      message.includes('email-already-in-use')
    ) {
      return 'This email is already registered.';
    }

    // Credentials / user not found check
    if (
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-email' ||
      message.includes('Incorrect') ||
      message.includes('not found') ||
      message.includes('Password is required')
    ) {
      return 'Incorrect username or password.';
    }

    if (message.includes('Passwords do not match')) {
      return 'Passwords do not match';
    }

    return 'Incorrect username or password.';
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      setErrorMessage('Incorrect username or password.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      await login(emailOrUsername, password);
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !signUpEmail || !signUpPassword) {
      setErrorMessage('Please fill in all required fields');
      return;
    }
    if (signUpPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      await signup(fullName, username, signUpEmail, signUpPassword, avatarPreset);
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-[#0a0b0e] flex flex-col justify-between overflow-y-auto overflow-x-hidden p-6 text-slate-900 dark:text-white">
      {/* Top Navigation Header */}
      <div className="relative z-10 flex items-center justify-between mb-4 pt-1">
        <button
          onClick={() => setScreen('welcome')}
          className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <GotULogo size={26} variant="icon" />
          <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
            got u
          </span>
        </div>

        <div className="w-9 h-9" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 my-auto">
        <AnimatePresence mode="wait">
          {authMode === 'signin' ? (
            <motion.div
              key="signin"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              {/* Title Header */}
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-1.5">
                  Login
                </h2>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Enter your username and password to continue.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  {errorMessage}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="Username"
                    autoComplete="username"
                    className="w-full h-12 px-4 rounded-2xl bg-[#141620] border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="w-full h-12 pl-4 pr-11 rounded-2xl bg-[#141620] border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Pink Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-2 rounded-full bg-[#ff2d60] hover:bg-[#ff2055] text-white text-xs font-bold shadow-lg shadow-[#ff2d60]/30 transition-all cursor-pointer flex items-center justify-center active:scale-[0.99]"
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </button>

                {/* Remember Me */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-slate-400 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-white/20 accent-[#ff2d60] bg-[#141620]"
                      />
                      <span>Remember me</span>
                    </label>
                  </div>
                </div>
              </form>

              {/* OR Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative px-3 bg-[#0a0b0e] text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  OR
                </span>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleSocialSignIn}
                  className="w-full h-12 rounded-2xl bg-[#141620] border border-white/5 hover:bg-[#1a1d29] text-xs font-medium text-white flex items-center justify-center gap-3 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleSocialSignIn}
                  className="w-full h-12 rounded-2xl bg-[#141620] border border-white/5 hover:bg-[#1a1d29] text-xs font-medium text-white flex items-center justify-center gap-3 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.54c.66-.8 1.11-1.92.99-3.04-1 .04-2.16.67-2.85 1.48-.61.72-1.14 1.87-1 2.99 1.12.09 2.22-.56 2.86-1.43z" />
                  </svg>
                  <span>Continue with Apple</span>
                </button>
              </div>

              {/* Switch to Signup */}
              <div className="mt-6 text-center text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setAuthMode('signup');
                  }}
                  className="text-[#ff2d60] font-bold hover:underline cursor-pointer ml-1"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              {/* Title Header */}
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-1">
                  Create Account
                </h2>
                <p className="text-xs text-slate-400">
                  Join got u today. Instant encrypted access.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  {errorMessage}
                </div>
              )}

              {/* Profile Photo selector */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative group cursor-pointer">
                  <img
                    src={avatarPreset}
                    alt="Avatar preset"
                    className="w-18 h-18 rounded-full object-cover border-2 border-[#ff2d60] shadow-xl"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Signup Form */}
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full h-11 px-3.5 rounded-xl bg-[#141620] border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="@johndoe"
                      className="w-full h-11 px-3.5 rounded-xl bg-[#141620] border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#141620] border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#141620] border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#141620] border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                  />
                </div>

                {/* Primary Pink Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-2 rounded-full bg-[#ff2d60] hover:bg-[#ff2055] text-white text-xs font-bold shadow-lg shadow-[#ff2d60]/30 transition-all cursor-pointer flex items-center justify-center"
                >
                  {isLoading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </form>

              {/* Switch to Signin */}
              <div className="mt-5 text-center text-xs text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setAuthMode('signin');
                  }}
                  className="text-[#ff2d60] font-bold hover:underline cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="py-2 text-center text-[10px] text-slate-600">
        got u • Modern Encrypted Messaging
      </div>
    </div>
  );
};


