'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function UpstoxCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Connecting to Upstox...');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      // In mock mode without real redirect from Upstox, just simulate success for testing
      setStatus('No code found. Switching to mock mode...');
      fetchToken('mock_code');
      return;
    }

    fetchToken(code);
  }, [searchParams]);

  const fetchToken = async (authCode: string) => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://portai-xsw3.onrender.com';
      const res = await fetch(`${API_BASE}/api/broker/callback/upstox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode }),
      });
      const data = await res.json();
      
      if (data.access_token) {
        setStatus('Successfully connected! Redirecting...');
        // Save the token to local storage so the frontend remembers the connection
        localStorage.setItem('upstox_access_token', data.access_token);
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setStatus('Failed to connect: ' + (data.error || 'Unknown error'));
        setTimeout(() => router.push('/'), 3000);
      }
    } catch (err) {
      setStatus('Error connecting to backend.');
      setTimeout(() => router.push('/'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
      <div className="glass-panel p-10 rounded-2xl max-w-md w-full border border-white/10">
        <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6">
          <iconify-icon icon="solar:link-circle-linear" style={{ fontSize: '32px' }}></iconify-icon>
        </div>
        <h2 className="text-xl font-medium text-white mb-2">Broker Integration</h2>
        <p className="text-sm text-white/50">{status}</p>
        
        {status.includes('Connecting') && (
          <div className="mt-8 flex justify-center">
             <span className="flex items-center gap-2 text-white/40 text-sm">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Securing connection...
             </span>
          </div>
        )}
      </div>
    </div>
  );
}
