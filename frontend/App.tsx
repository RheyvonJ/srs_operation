"use client";

import React, { useState } from 'react';
import { BrandHero } from './components/BrandHero';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [session, setSession] = useState<{
    username: string;
  } | null>(null);

  const handleLoginSuccess = (data: { username: string }) => {
    setSession(data);
  };

  const handleLogout = () => {
    setSession(null);
  };

  if (session) {
    return <Dashboard username={session.username} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#212529] flex flex-col justify-between selection:bg-[#E5383B] selection:text-white font-body">
      
      {/* Top Utility Ribbon */}
      <header className="bg-[#0D1B2A] text-white border-b border-[#1E3348] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex shrink-0 overflow-hidden rounded-2xl bg-white p-1">
              <img
                src="/srs-logo.png"
                alt="San Roque Supermarket"
                className="h-8 w-auto object-contain"
              />
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-heading font-extrabold text-sm uppercase tracking-tight text-white whitespace-nowrap">
                San Roque Supermarket
              </span>
              <span className="hidden sm:inline text-white/30">|</span>
              <span className="text-[11px] font-medium text-white/70 whitespace-nowrap">
                Retail Systems Inc.
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-6xl mx-auto bg-[#FFFCF8] rounded-3xl shadow-2xl shadow-[#0D1B2A]/10 border border-[#E6E0D6] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
            {/* Left 5 cols on lg / 6 cols on xl: Retail Atmosphere Hero */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-6 h-full">
              <BrandHero />
            </div>

            {/* Right 7 cols on lg / 6 cols on xl: Clean Login Form */}
            <div className="relative col-span-1 lg:col-span-7 xl:col-span-6 flex flex-col items-center justify-center overflow-hidden p-4 sm:p-8 xl:p-12 bg-[#F7F4EF]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#FFD166]/45 blur-3xl" />
                <div className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-[#E5383B]/18 blur-3xl" />
                <div className="absolute right-10 top-16 h-36 w-36 rounded-full border border-[#0D1B2A]/10" />
                <div className="absolute right-16 top-20 h-24 w-24 rounded-full border border-[#E5383B]/25" />
                <div className="absolute bottom-14 left-8 h-28 w-28 rounded-full border-2 border-[#FFD166]/70" />
                <div className="absolute bottom-24 left-16 h-10 w-10 rounded-full bg-[#0D1B2A]/10" />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice">
                  <path d="M-20 120 C 120 40, 220 200, 420 90" fill="none" stroke="#0D1B2A" strokeOpacity="0.08" strokeWidth="2" />
                  <path d="M80 640 C 200 520, 340 700, 620 540" fill="none" stroke="#E5383B" strokeOpacity="0.18" strokeWidth="3" />
                  <path d="M460 20 C 500 160, 380 220, 560 320" fill="none" stroke="#FFD166" strokeOpacity="0.7" strokeWidth="2" />
                </svg>
              </div>
              <div className="relative z-10 w-full">
                <LoginForm onSuccess={handleLoginSuccess} />
              </div>
            </div>
          </div>
      </main>

      {/* Footer Notice & Security Disclaimer */}
      <footer className="bg-[#0D1B2A] text-white/55 text-xs border-t border-[#FFD166]/25 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-white/80">San Roque Supermarket Retail Systems Inc.</span>
            <span className="mx-2 text-[#FFD166]/70">·</span>
            <span>Enterprise Point-of-Sale & Store Operations Portal</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-white/50">
            <span>Security ID: SRS-POS-SEC-v4</span>
            <span>·</span>
            <span>Encrypted BIR Terminal Relay</span>
            <span>·</span>
            <span>© 2026 SRS Inc.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
