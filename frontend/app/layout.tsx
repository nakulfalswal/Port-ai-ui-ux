import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PortAI – Institutional-Grade Financial Intelligence',
  description: 'AI-powered financial intelligence platform for Indian retail investors. Hedge-fund quality analysis for everyone.',
}

import Header from '@/components/Header'
import { AuthProvider } from '@/context/AuthContext'
import AuthLanyardBadge from '@/components/AuthLanyardBadge'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
        {/* UnicornStudio Script */}
        <script src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.34/dist/unicornStudio.umd.js" async={true}></script>
      </head>
      <body className="antialiased selection:bg-white/20 selection:text-white pb-20 bg-black">
        {/* Background Component - Optimized by removing expensive filters */}
        <div className="fixed top-0 w-full h-screen -z-10 pointer-events-none" 
             style={{ 
               maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)', 
               WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
               opacity: 0.6
             }}>
          <div data-us-project="bmaMERjX2VZDtPrh4Zwx" className="absolute w-full h-full left-0 top-0 -z-10 pointer-events-none"></div>
          <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none"></div>
        </div>

        <AuthProvider>
          <Header />
          {children}
          {/* Mini lanyard badge — only shown when user is logged in */}
          <AuthLanyardBadge />
        </AuthProvider>
        
        {/* Init UnicornStudio wrapper script */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('load', function() {
            if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
              window.UnicornStudio.init();
              window.UnicornStudio.isInitialized = true;
            }
          });
        `}} />
      </body>
    </html>
  )
}
