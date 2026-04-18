'use client';

import React from 'react';

const PricingPage = () => {
  return (
    <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-white mb-6">
          Institutional intelligence. <br /> Retail pricing.
        </h1>
        <p className="text-white/60 text-lg mx-auto max-w-xl">
          Choose the plan that fits your execution style. Cancel anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Starter Plan */}
        <div className="glass-panel p-8 rounded-3xl relative flex flex-col">
          <div className="mb-8">
            <h2 className="text-xl font-medium text-white mb-2">Starter</h2>
            <p className="text-sm text-white/40">Essential intelligence for casual investors.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-medium text-white">$0</span>
              <span className="text-sm text-white/40">/month</span>
            </div>
          </div>
          
          <div className="space-y-4 mb-8 flex-1">
             {['1 Connected Portfolio', 'Daily Sentiment Summaries', 'Basic Risk Scoring', 'End-of-day Data Sync'].map((feature, i) => (
               <div key={i} className="flex items-start gap-3 text-sm text-white/70">
                 <iconify-icon icon="solar:check-circle-linear" className="text-white/40 mt-0.5" width="16"></iconify-icon>
                 <span>{feature}</span>
               </div>
             ))}
          </div>

          <button className="w-full py-3 rounded-xl border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors">
            Get Started
          </button>
        </div>

        {/* Pro Plan */}
        <div className="glass-panel p-8 rounded-3xl relative flex flex-col border-blue-500/30 transform md:-translate-y-4">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-t-3xl"></div>
          <div className="absolute -top-3 right-8 px-3 py-1 bg-blue-500 rounded-full text-[10px] font-bold tracking-widest uppercase text-white shadow-lg">
            Most Popular
          </div>
          
          <div className="mb-8 mt-2">
            <h2 className="text-xl font-medium text-white mb-2">Pro Analyst</h2>
            <p className="text-sm text-white/40">Advanced features for active traders.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-medium text-white">$29</span>
              <span className="text-sm text-white/40">/month</span>
            </div>
          </div>
          
          <div className="space-y-4 mb-8 flex-1">
             {['Unlimited Portfolios', 'Real-time Bias Detection', 'Institutional AI Reports (x10/mo)', '3D Market Visualizer', 'API Access (Basic)'].map((feature, i) => (
               <div key={i} className="flex items-start gap-3 text-sm text-white/90">
                 <iconify-icon icon="solar:check-circle-linear" className="text-blue-400 mt-0.5" width="16"></iconify-icon>
                 <span>{feature}</span>
               </div>
             ))}
          </div>

          <button className="w-full py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            Start 14-Day Trial
          </button>
        </div>

        {/* Institutional Plan */}
        <div className="glass-panel p-8 rounded-3xl relative flex flex-col">
          <div className="mb-8">
            <h2 className="text-xl font-medium text-white mb-2">Institutional</h2>
            <p className="text-sm text-white/40">For family offices and fund managers.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-medium text-white">$499</span>
              <span className="text-sm text-white/40">/month</span>
            </div>
          </div>
          
          <div className="space-y-4 mb-8 flex-1">
             {['Unlimited AI Reports', 'Custom Factor Models', 'Real-time News Sentiment Feed', 'Dedicated Account Manager', 'Full API Access'].map((feature, i) => (
               <div key={i} className="flex items-start gap-3 text-sm text-white/70">
                 <iconify-icon icon="solar:check-circle-linear" className="text-purple-400 mt-0.5" width="16"></iconify-icon>
                 <span>{feature}</span>
               </div>
             ))}
          </div>

          <button className="w-full py-3 rounded-xl border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors">
            Contact Sales
          </button>
        </div>
      </div>
    </main>
  );
};

export default PricingPage;
