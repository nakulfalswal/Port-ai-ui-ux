'use client';

import React from 'react';

const AboutPage = () => {
  return (
    <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tighter text-white mb-6">
          Democratizing <br /> Institutional Alpha
        </h1>
        <p className="text-white/60 text-lg mx-auto max-w-2xl leading-relaxed">
          For too long, the most powerful predictive models, sentiment engines, and risk management tools have been locked behind the closed doors of billion-dollar hedge funds. We are changing that.
        </p>
      </div>

      <div className="glass-panel p-8 md:p-12 rounded-[2rem] mb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <h2 className="text-2xl font-medium text-white mb-6">Our Mission</h2>
        <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
          <p>
            PortAI was founded by former quantitative analysts and AI researchers who witnessed the growing disparity between institutional capabilities and the tools available to retail investors.
          </p>
          <p>
            While retail traders rely on delayed news and basic charting, institutions utilize neural networks processing thousands of data points per second to front-run sentiment shifts and manage risk clustering.
          </p>
          <p>
            Our mission is simple: provide retail investors with a personal AI analyst capable of institutional-grade financial intelligence. By leveraging state-of-the-art Large Language Models and real-time market data pipelines, PortAI identifies hidden correlations, detects behavioral biases, and provides actionable, data-driven intelligence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
          <div className="text-3xl font-medium text-blue-400 mb-2">150k+</div>
          <div className="text-xs text-white/40 uppercase tracking-widest">Portfolios Analyzed</div>
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
          <div className="text-3xl font-medium text-emerald-400 mb-2">$2B+</div>
          <div className="text-xs text-white/40 uppercase tracking-widest">Assets Tracked</div>
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
          <div className="text-3xl font-medium text-purple-400 mb-2">&lt;50ms</div>
          <div className="text-xs text-white/40 uppercase tracking-widest">Signal Latency</div>
        </div>
      </div>
    </main>
  );
};

export default AboutPage;
