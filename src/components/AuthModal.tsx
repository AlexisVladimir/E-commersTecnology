'use client';

import { X, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { apiFetch } from '@/lib/api';
import { useState } from 'react';

export default function AuthModal() {
  const { authOpen, setAuthOpen, authMode, setAuthMode, setIsLoggedIn, setAccountTab, setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!authOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (authMode === 'register') {
        const [firstName, ...rest] = name.trim().split(' ');
        const lastName = rest.join(' ') || 'User';
        const response = await apiFetch<{ user: { id: number; email: string; firstName: string; lastName: string } }>(
          '/users/register/',
          {
            method: 'POST',
            body: JSON.stringify({ email, password, firstName, lastName }),
          }
        );
        setUser(response.user);
      } else {
        const response = await apiFetch<{ user: { id: number; email: string; firstName: string; lastName: string } }>(
          '/users/login/',
          {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          }
        );
        setUser(response.user);
      }
      sessionStorage.setItem('auth:active', '1');
      setIsLoggedIn(true);
      setAuthOpen(false);
      setAccountTab('profile');
      window.location.href = '/catalog';
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setAuthOpen(false)}
      />

      {/* Card */}
      <div className="relative w-full max-w-[420px] mx-4 rounded-xl border border-[#1E1E1E] bg-[#141414] p-8 shadow-2xl">
        <button
          onClick={() => setAuthOpen(false)}
          className="absolute right-4 top-4 rounded-md p-1.5 text-[#808080] hover:text-white hover:bg-[#1A1A1A] transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="mb-1 text-2xl font-bold text-white">
          {authMode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="mb-6 text-sm text-[#808080]">
          {authMode === 'login'
            ? 'Sign in to access your account'
            : 'Join TechStore for exclusive deals'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          {authMode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Full Name
              </label>
              <div className="relative">
                <UserIcon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]"
                />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D6CDF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7]"
          >
            {authMode === 'login' ? 'Sign In' : 'Create Account'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#808080]">
            {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="ml-1.5 text-sm font-medium text-[#2D6CDF] hover:underline"
            >
              {authMode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Social login */}
        <div className="mt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1E1E1E]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#141414] px-2 text-[#606060]">or continue with</span>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E1E1E] text-[#A0A0A0] hover:border-[#808080] hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E1E1E] text-[#A0A0A0] hover:border-[#808080] hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E1E1E] text-[#A0A0A0] hover:border-[#808080] hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-2.89 1.73-2.39 5.98.22 7.13-.57 1.5-1.31 2.99-2.27 4.08zm-5.85-15.1c.07-1.04.78-2.03 1.64-2.61.89-.62 2.12-.87 3.17-.56-.26 1.18-.99 2.15-1.96 2.73-1.06.66-2.34.95-3.64.56-.22-.36-.22-.76-.21-1.12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
