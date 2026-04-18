'use client';

import React from 'react';

const MarketIntelligence = () => {
  return (
    <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-medium tracking-tight text-white mb-2">Market Intelligence</h1>
        <p className="text-white/40 text-sm">Real-time sentiment and news-driven alpha signals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white uppercase tracking-widest text-[10px]">Financial Headlines</h3>
            <div className="flex gap-2">
               <button className="px-3 py-1 rounded-md bg-white text-black text-[10px] font-medium">Global</button>
               <button className="px-3 py-1 rounded-md bg-white/5 text-white/40 text-[10px] font-medium hover:text-white transition-colors">Crypto</button>
               <button className="px-3 py-1 rounded-md bg-white/5 text-white/40 text-[10px] font-medium hover:text-white transition-colors">Forex</button>
            </div>
          </div>

          {[
            { title: 'Nvidia Market Cap Surges as AI Demand Accelerates', source: 'Bloomberg', time: '12m ago', sentiment: 'Bullish' },
            { title: 'Federal Reserve Signals Higher Rates for Longer', source: 'WSJ', time: '1h ago', sentiment: 'Bearish' },
            { title: 'European Markets Mixed Amid Inflation Data', source: 'Reuters', time: '2h ago', sentiment: 'Neutral' },
            { title: 'Tech Sector Faces Regulatory Headwinds in EU', source: 'FT', time: '4h ago', sentiment: 'Bearish' },
            { title: 'New Energy Subsidy Package Boosts Solar Stocks', source: 'CNBC', time: '5h ago', sentiment: 'Bullish' },
          ].map((news, i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl group cursor-pointer hover:bg-white/5 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] text-white/30 uppercase tracking-widest">{news.source} • {news.time}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  news.sentiment === 'Bullish' ? 'bg-green-500/10 text-green-400' :
                  news.sentiment === 'Bearish' ? 'bg-red-500/10 text-red-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {news.sentiment}
                </span>
              </div>
              <h2 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors mb-4">{news.title}</h2>
              <div className="flex items-center gap-4 text-[10px] text-white/40">
                <span className="flex items-center gap-1"><iconify-icon icon="solar:chat-round-dots-linear"></iconify-icon> 24 Comments</span>
                <span className="flex items-center gap-1"><iconify-icon icon="solar:share-linear"></iconify-icon> Share Insight</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-medium text-white mb-6">Sentiment Heatmap</h3>
            <div className="grid grid-cols-2 gap-4">
               {[
                 { label: 'S&P 500', value: 0.8, status: 'Greedy' },
                 { label: 'BTC/USD', value: 0.4, status: 'Fear' },
                 { label: 'DXY Index', value: 0.6, status: 'Neutral' },
                 { label: 'Volatility', value: 0.2, status: 'Extreme Fear' },
               ].map(item => (
                 <div key={item.label} className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-white/40 mb-1">{item.label}</div>
                    <div className="text-xs font-medium text-white">{item.status}</div>
                    <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500" style={{ width: `${item.value * 100}%` }}></div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-medium text-white mb-6">AI Summary</h3>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <p className="text-xs text-blue-400/90 leading-relaxed italic">
                "Markets are currently reacting to hawkish Fed commentary. AI sentiment remains localized in semicondutors while broader indices consolidate. Institutional order flow suggests a defensive rotation."
              </p>
            </div>
            <button className="w-full mt-6 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-gray-200 transition-colors">
              Generate Custom Brief
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default MarketIntelligence;
