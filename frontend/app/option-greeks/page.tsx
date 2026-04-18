import React from 'react';

export default function OptionGreeksPage() {
  return (
    <div className="w-full h-full relative z-10 pt-24 px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
            <iconify-icon icon="solar:math-linear" width="28"></iconify-icon>
          </div>
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-white mb-1">Option Greeks</h1>
            <p className="text-white/50 text-sm">Institutional-grade intelligence for option greeks.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {/* Placeholder content cards */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
            <div className="h-4 w-1/3 bg-white/10 rounded mb-4 animate-pulse"></div>
            <div className="h-32 w-full bg-white/5 rounded-xl animate-pulse"></div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors lg:col-span-2">
            <div className="h-4 w-1/4 bg-white/10 rounded mb-4 animate-pulse"></div>
            <div className="h-32 w-full bg-white/5 rounded-xl animate-pulse"></div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors lg:col-span-3">
            <div className="h-4 w-1/5 bg-white/10 rounded mb-4 animate-pulse"></div>
            <div className="h-64 w-full bg-white/5 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
