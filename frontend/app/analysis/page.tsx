'use client';

import React, { useState } from 'react';

const PortfolioAnalyzer = () => {
  const [assets, setAssets] = useState([
    { symbol: 'AAPL', quantity: 10, cost: 150, sector: 'Technology' },
    { symbol: 'MSFT', quantity: 5, cost: 310, sector: 'Technology' },
  ]);

  return (
    <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-medium tracking-tight text-white mb-2">Portfolio Analyzer</h1>
        <p className="text-white/40 text-sm">Deep dive into your diversification and risk exposure.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-medium text-white mb-6">Manage Assets</h3>
            
            <div className="space-y-4 mb-8">
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-xs text-white/40 hover:border-white/20 hover:text-white transition-all">
                <iconify-icon icon="solar:upload-linear"></iconify-icon>
                Upload Portfolio CSV
              </button>
              <div className="text-center text-[10px] text-white/20 uppercase tracking-widest">or</div>
              <button className="w-full py-3 rounded-xl bg-white text-black text-xs font-medium hover:bg-white/90 transition-colors">
                Add Asset Manually
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] text-white/30 uppercase tracking-widest">Current Holdings</h4>
              {assets.map((asset, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <div className="text-xs font-medium text-white">{asset.symbol}</div>
                    <div className="text-[10px] text-white/40">{asset.quantity} Shares @ ${asset.cost}</div>
                  </div>
                  <button className="text-white/20 hover:text-red-400 transition-colors">
                    <iconify-icon icon="solar:trash-bin-trash-linear"></iconify-icon>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-medium text-white mb-4">Bias Interventions</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Our AI analysis detects patterns of behavior in your trading history.
            </p>
            <div className="mt-6 space-y-3">
               <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                  <div className="text-[10px] text-yellow-500 font-medium mb-1">Warning: FOMO Bias</div>
                  <p className="text-[10px] text-white/40 italic">You tend to buy assets after they rise more than 15% in a week.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Analysis Output */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-2xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Diversification Health</h3>
                <p className="text-[10px] text-white/30 italic">Calculating based on sector and asset correlation.</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-medium text-blue-400">74/100</div>
                <div className="text-[10px] text-white/40">Optimal Score</div>
              </div>
            </div>

            <div className="aspect-[21/9] bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center mb-8">
               <p className="text-white/20 text-xs">Dynamic Allocation Chart</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
               <div>
                  <div className="text-[10px] text-white/40 uppercase mb-2">Max Leakage</div>
                  <div className="text-sm text-red-400 font-medium">12.4% Tech</div>
               </div>
               <div>
                  <div className="text-[10px] text-white/40 uppercase mb-2">Correlation</div>
                  <div className="text-sm text-white font-medium">0.64 Beta</div>
               </div>
               <div>
                  <div className="text-[10px] text-white/40 uppercase mb-2">Alpha Potential</div>
                  <div className="text-sm text-emerald-400 font-medium">+4.2% Est.</div>
               </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl">
            <h3 className="text-sm font-medium text-white mb-6">Asset Intelligence</h3>
            <div className="space-y-4">
              {[
                { symbol: 'AAPL', insight: 'Maintaining strong support at $180. Oversold signal detected.' },
                { symbol: 'MSFT', insight: 'AI integration driving revision of price targets to $420.' },
              ].map(asset => (
                <div key={asset.symbol} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                   <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs">{asset.symbol}</div>
                   <div>
                      <p className="text-xs text-white/80 leading-relaxed">{asset.insight}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PortfolioAnalyzer;
