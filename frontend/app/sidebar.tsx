'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const features = [
    { category: "Core Intelligence", items: [
        { route: "/", title: "Main Platform", icon: "solar:home-2-linear" },
        { route: "/dashboard", title: "Overview Dashboard", icon: "solar:graph-up-linear" },
        { route: "/ai-analyst", title: "AI Financial Analyst", icon: "solar:magic-stick-3-linear" },
        { route: "/portfolio-analyzer", title: "Portfolio Analyzer", icon: "solar:pie-chart-2-linear" }
    ]},
    { category: "Market & Economics", items: [
        { route: "/global-markets", title: "Global Markets", icon: "solar:globe-linear" },
        { route: "/macro-economics", title: "Macro Economics", icon: "solar:earth-linear" },
        { route: "/economic-calendar", title: "Economic Calendar", icon: "solar:calendar-date-linear" },
        { route: "/yield-curve", title: "Yield Curve", icon: "solar:chart-2-linear" },
        { route: "/vix-monitor", title: "VIX & Volatility", icon: "solar:graph-down-linear" }
    ]},
    { category: "Equities & Fundamentals", items: [
        { route: "/equities-screener", title: "Equities Screener", icon: "solar:filter-linear" },
        { route: "/fundamental-analysis", title: "Fundamental Analysis", icon: "solar:document-text-linear" },
        { route: "/financial-ratios", title: "Financial Ratios", icon: "solar:calculator-linear" },
        { route: "/peer-comparison", title: "Peer Comparison", icon: "solar:users-group-two-rounded-linear" },
        { route: "/earnings-transcripts", title: "Earnings Transcripts", icon: "solar:microphone-linear" },
        { route: "/corporate-actions", title: "Corporate Actions", icon: "solar:calendar-linear" }
    ]},
    { category: "Advanced Trading", items: [
        { route: "/technical-charts", title: "Technical Charts", icon: "solar:chart-square-linear" },
        { route: "/algo-builder", title: "Algo Bot Builder", icon: "solar:code-linear" },
        { route: "/backtesting", title: "Backtesting Engine", icon: "solar:history-linear" },
        { route: "/paper-trading", title: "Paper Trading", icon: "solar:gamepad-linear" },
        { route: "/historical-data", title: "Historical Data", icon: "solar:server-square-linear" }
    ]},
    { category: "Derivatives & Options", items: [
        { route: "/options-chain", title: "Options Chain", icon: "solar:diagram-down-linear" },
        { route: "/option-greeks", title: "Option Greeks", icon: "solar:math-linear" },
        { route: "/derivatives-heatmap", title: "Derivatives Heatmap", icon: "solar:map-arrow-up-linear" },
        { route: "/market-breadth", title: "Market Breadth", icon: "solar:chart-pie-linear" }
    ]},
    { category: "Alternative Data", items: [
        { route: "/dark-pool", title: "Dark Pool Monitor", icon: "solar:eye-linear" },
        { route: "/institutional-holdings", title: "Institutional Holdings", icon: "solar:banknotes-linear" },
        { route: "/insider-trading", title: "Insider Trading", icon: "solar:incognito-linear" },
        { route: "/news-sentiment", title: "News & Sentiment", icon: "solar:newspaper-linear" },
        { route: "/esg-scores", title: "ESG Score Analyzer", icon: "solar:leaf-linear" },
        { route: "/alerts", title: "Alerts & Notifications", icon: "solar:bell-linear" }
    ]},
    { category: "Assets & Funds", items: [
        { route: "/index-funds", title: "Index Funds", icon: "solar:bookmark-circle-linear" },
        { route: "/mutual-funds", title: "Mutual Funds", icon: "solar:wallet-linear" },
        { route: "/etf-analyzer", title: "ETF Analyzer", icon: "solar:box-linear" },
        { route: "/reit-analyzer", title: "REIT Analyzer", icon: "solar:buildings-linear" },
        { route: "/fixed-income", title: "Fixed Income & Bonds", icon: "solar:bill-linear" },
        { route: "/forex", title: "Forex & Currencies", icon: "solar:dollar-linear" },
        { route: "/commodities", title: "Commodities Tracking", icon: "solar:gold-linear" },
        { route: "/crypto", title: "Crypto Assets", icon: "solar:cpu-linear" },
        { route: "/ipo-watch", title: "IPO Watch", icon: "solar:rocket-linear" }
    ]},
    { category: "Risk & Strategy", items: [
        { route: "/risk-calculator", title: "Risk Management", icon: "solar:shield-warning-linear" },
        { route: "/correlation-matrix", title: "Correlation Matrix", icon: "solar:scanner-linear" },
        { route: "/sector-rotation", title: "Sector Rotation", icon: "solar:refresh-circle-linear" },
        { route: "/dividend-tracker", title: "Dividend Tracker", icon: "solar:money-bag-linear" }
    ]}
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button onClick={() => setIsOpen(!isOpen)} className="fixed top-4 left-4 z-[99] lg:hidden w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-white backdrop-blur-md">
        <iconify-icon icon={isOpen ? "solar:close-linear" : "solar:hamburger-menu-linear"} width="20"></iconify-icon>
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setIsOpen(false)}></div>
      )}

      {/* Sidebar Container */}
      <aside className={`fixed top-0 left-0 h-screen w-64 bg-black/80 backdrop-blur-xl border-r border-white/5 z-[95] pb-10 transition-transform duration-300 flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Header */}
        <div className="h-16 flex items-center px-6 shrink-0 border-b border-white/5 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex text-black bg-white w-7 h-7 rounded-lg items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              <iconify-icon icon="solar:shield-check-bold" width="16"></iconify-icon>
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">PortAI</span>
          </div>
        </div>

        {/* Scrollable links list */}
        <div className="flex-1 overflow-y-auto w-full px-3 py-2 space-y-6 custom-scrollbar">
          {features.map((group, i) => (
            <div key={i} className="px-2">
              <h4 className="text-[10px] font-semibold text-white/40 tracking-wider uppercase mb-2">{group.category}</h4>
              <ul className="space-y-1">
                {group.items.map((item, j) => {
                  const isActive = pathname === item.route;
                  return (
                    <li key={j}>
                      <Link href={item.route} onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                        <iconify-icon icon={item.icon} width="16" className={isActive ? 'text-blue-400' : 'text-white/40'}></iconify-icon>
                        {item.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Bottom Status */}
        <div className="p-4 mt-auto border-t border-white/5 mx-3 pt-4">
           <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex flex-shrink-0 items-center justify-center text-emerald-400">
                  <iconify-icon icon="solar:server-square-linear"></iconify-icon>
              </div>
              <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white/60">System Status</div>
                  <div className="text-xs font-medium text-emerald-400 animate-pulse truncate">Optimal</div>
              </div>
           </div>
        </div>
      </aside>

      {/* Global CSS for hiding scrollbar visually but keeping it functional */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </>
  );
}
