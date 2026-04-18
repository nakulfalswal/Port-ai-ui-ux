'use client';

import React from 'react';

const AdvisorPage = () => {
  return (
    <main className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
      <div className="glass-panel p-12 rounded-[2rem] shadow-2xl overflow-hidden relative">
        {/* Report Header */}
        <div className="absolute top-0 right-0 p-8">
           <div className="text-right">
              <div className="text-[10px] text-white/20 uppercase tracking-[0.2em] mb-1">Confidential Intelligence</div>
              <div className="text-[10px] text-white/40">ID: PA-492-X10</div>
           </div>
        </div>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
              <iconify-icon icon="solar:shield-star-linear" width="18"></iconify-icon>
            </div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase">Executive Intelligence Report</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-6">Portfolio Optimization & Risks</h1>
          <div className="flex gap-6 text-[10px] text-white/40">
            <span>Prepared for: Retail Investor Alpha</span>
            <span>Date: March 2024</span>
            <span>Analyzed by: PortAI Neural Engine</span>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-white/70">
          <section>
            <h3 className="text-white text-lg font-medium mb-4">1. Executive Summary</h3>
            <p className="text-sm leading-relaxed">
              The aggregate portfolio demonstrates strong performance in the Technology sector but reveals significant "Concentration Risk" that may lead to excessive volatility in a high-interest-rate environment. Current diversification score is <span className="text-blue-400">74/100</span>.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <h4 className="text-xs font-semibold text-white mb-4 uppercase">Primary Strengths</h4>
                <ul className="text-xs space-y-2 list-disc pl-4">
                  <li>Strong exposure to Cash-Flow rich entities.</li>
                  <li>Optimal liquidity ratios for current market.</li>
                  <li>Efficient tax harvesting opportunities.</li>
                </ul>
             </div>
             <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <h4 className="text-xs font-semibold text-white mb-4 uppercase">Risk Vectors</h4>
                <ul className="text-xs space-y-2 list-disc pl-4">
                  <li>Over-exposure to Mag-7 (65% of total value).</li>
                  <li>Negative correlation with rising Energy costs.</li>
                  <li>Lack of Emerging Markets hedges.</li>
                </ul>
             </div>
          </section>

          <section>
            <h3 className="text-white text-lg font-medium mb-4">2. Behavioral Insights</h3>
            <p className="text-sm leading-relaxed mb-6">
              Our neural analysis of your trade history (124 events) suggests a moderate pattern of <strong>"Loss Aversion"</strong>. You tend to hold losing positions 4.2x longer than winners, impacting overall IRR by estimated <span className="text-red-400">2.1% annually</span>.
            </p>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 italic text-xs text-blue-400/80">
              Recommendation: Implement automated 'Trailing Stop-Loss' orders at 15% to mitigate downside variance without emotional intervention.
            </div>
          </section>

          <section>
            <h3 className="text-white text-lg font-medium mb-4">3. Strategic Allocation Matrix</h3>
            <div className="h-64 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center">
               <p className="text-[10px] text-white/20 italic text-center">Neural Prediction Model: Estimated Volatility Surface</p>
            </div>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-center">
          <div className="flex gap-4">
             <button className="px-6 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-white/90 transition-colors">Download PDF</button>
             <button className="px-6 py-2 rounded-lg border border-white/10 text-xs font-medium text-white/60 hover:bg-white/5 transition-colors">Share Report</button>
          </div>
          <iconify-icon icon="solar:verified-check-linear" className="text-emerald-400" width="24"></iconify-icon>
        </div>
      </div>
    </main>
  );
};

export default AdvisorPage;
