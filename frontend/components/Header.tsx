'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import ShinyText from './reactbits/ShinyText';
import GooeyNav from './reactbits/GooeyNav/GooeyNav';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex justify-center py-6 px-4 ${scrolled ? 'pt-3' : 'pt-6'}`}>
      <div className={`transition-all duration-500 ease-out flex items-center justify-between px-8 relative overflow-hidden ${
        scrolled 
          ? 'w-[85%] max-w-5xl h-14 rounded-2xl premium-glass shadow-2xl' 
          : 'w-full max-w-7xl h-16 rounded-3xl bg-white/[0.02] border border-white/5'
      }`}>
        {/* Subtle radial glow inside header when scrolled */}
        {scrolled && (
          <div className="absolute inset-0 bg-blue-500/[0.03] pointer-events-none"></div>
        )}

        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-4 relative z-10 group cursor-pointer">
          <div className="relative">
            <div className="relative flex text-black bg-white w-9 h-9 rounded-xl items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] transition-all duration-500 overflow-hidden">
               <iconify-icon icon="solar:shield-check-bold" width="22"></iconify-icon>
            </div>
          </div>
          <span className="text-lg font-bold tracking-tighter">
            <ShinyText text="PortAI" speed={3} color="#e5e5e5" shineColor="#ffffff" className="text-lg font-bold tracking-tighter" />
          </span>
        </Link>
        
        {/* Navigation Links — GooeyNav */}
        <div className="hidden md:flex items-center relative z-10">
          <GooeyNav
            items={[
              { label: 'Markets', href: '/#markets' },
              { label: 'Portfolios', href: '/portfolios' },
              { label: 'Intelligence', href: '/intelligence' },
              { label: 'Sectors', href: '/sectors' },
              { label: 'Workflow', href: '/workflow' },
              { label: 'Hedge Fund', href: '/hedge-fund' },
            ]}
            particleCount={12}
            particleDistances={[80, 8]}
            particleR={80}
            animationTime={550}
            timeVariance={250}
            colors={[1, 2, 3, 1, 2, 4]}
            initialActiveIndex={0}
          />
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-6 relative z-10">
          <div className="hidden lg:flex items-center gap-2 text-[10px] uppercase tracking-widest bg-white/[0.03] px-4 py-2 rounded-full border border-white/10 group hover:border-emerald-500/30 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ticker-live shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <ShinyText text="AI LIVE ANALYSIS" speed={2.5} color="rgba(52,211,153,0.8)" shineColor="#ffffff" className="text-[10px] uppercase tracking-widest font-semibold" />
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => signOut()}
                className="text-[11px] font-bold text-white/30 hover:text-red-400 transition-colors uppercase tracking-wider"
              >
                Sign Out
              </button>
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <iconify-icon icon="solar:user-bold-duotone" width="20"></iconify-icon>
                )}
              </div>
            </div>
          ) : (
            <Link href="/auth" 
              className="group relative px-6 py-2.5 rounded-xl bg-white text-black text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.1] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <span className="relative z-10">Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
