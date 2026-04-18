'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              phone_number: phone, // Store phone in user_metadata
            },
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registration successful! Check your email to confirm.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // If user logs in and has a phone number entered, update metadata
        if (phone) {
          await supabase.auth.updateUser({
            data: { phone_number: phone },
          });
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-black">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md fade-up z-10">
        <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500 opacity-50"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 group transition-all hover:scale-110 duration-500">
              <iconify-icon icon="solar:user-circle-bold-duotone" width="32" className="text-blue-400 group-hover:text-emerald-400 transition-colors"></iconify-icon>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              {isSignUp ? 'Create an Account' : 'Welcome to PortAI'}
            </h1>
            <p className="text-white/40 text-sm mt-2">
              {isSignUp ? 'Join the institutional intelligence network' : 'Sign in to access your dashboard'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-blue-400 transition-colors">
                  <iconify-icon icon="solar:letter-linear" width="18"></iconify-icon>
                </div>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5 ml-1">
                WhatsApp Number <span className="text-white/15">(for report delivery)</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-emerald-400 transition-colors">
                  <iconify-icon icon="solar:phone-linear" width="18"></iconify-icon>
                </div>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
                />
              </div>
              <p className="text-[9px] text-white/20 mt-1 ml-1">Include country code. Reports will be sent via WhatsApp & email.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-blue-400 transition-colors">
                  <iconify-icon icon="solar:lock-password-unlocked-linear" width="18"></iconify-icon>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-white/20 hover:text-white/60 transition-colors"
                >
                  <iconify-icon icon={showPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} width="18"></iconify-icon>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-3 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <iconify-icon icon="solar:restart-linear" className="animate-spin" width="18"></iconify-icon>
              ) : (
                <>
                  <iconify-icon icon={isSignUp ? "solar:user-plus-linear" : "solar:login-2-linear"} className="group-hover:translate-x-1 transition-transform" width="18"></iconify-icon>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-blue-400/60 hover:text-blue-400 transition-colors font-medium"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#0c0c0c] px-3 text-white/20 tracking-widest font-bold">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 text-white font-medium py-3 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95 group"
          >
            <iconify-icon icon="logos:google-icon" width="18"></iconify-icon>
            Sign in with Google
          </button>

          {message && (
            <div className={`mt-6 p-4 rounded-2xl text-xs flex items-start gap-3 fade-up ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <iconify-icon 
                icon={message.type === 'success' ? 'solar:check-circle-linear' : 'solar:danger-triangle-linear'} 
                width="16" 
                className="mt-0.5"
              ></iconify-icon>
              <span className="flex-1">{message.text}</span>
            </div>
          )}
        </div>
        
        <p className="text-center mt-8 text-white/20 text-[10px] tracking-wide uppercase font-bold">
          By signing in, you agree to our <a href="#" className="text-white/40 hover:text-white transition-colors">Terms of Service</a>
        </p>
      </div>
    </main>
  );
}
