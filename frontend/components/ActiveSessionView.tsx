declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: any;
    }
  }
}

import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Store, 
  Layers, 
  Barcode, 
  Receipt, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';


interface ActiveSessionViewProps {
  username: string;
  onLogout: () => void;
}

export const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({
  username,
  onLogout,
}) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [activeLaneStatus, setActiveLaneStatus] = useState<'Ready' | 'Busy' | 'Syncing'>('Ready');
  const [recentActionMsg, setRecentActionMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = (label: string) => {
    setActiveLaneStatus('Syncing');
    setRecentActionMsg(`Launching ${label}...`);
    setTimeout(() => {
      setActiveLaneStatus('Ready');
      setRecentActionMsg(`${label} session active & synced with branch server.`);
      setTimeout(() => setRecentActionMsg(null), 4000);
    }, 600);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Session Container Card (Secondary Navy with Crisp White inner structure) */}
      <div className="bg-[#0D1B2A] text-white rounded-2xl shadow-2xl shadow-[#0D1B2A]/20 border border-[#1E3348] overflow-hidden">
        {/* Header Ribbon */}
        <div className="relative bg-[#0D1B2A] px-6 py-4 flex items-center justify-between border-b border-[#FFD166]/25">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E5383B]" />
          <div className="flex items-center gap-3">
            <span className="inline-flex shrink-0 overflow-hidden rounded-2xl bg-white p-1">
              <img
                src="/srs-logo.png"
                alt="San Roque Supermarket"
                className="h-9 w-auto object-contain"
              />
            </span>
            <div>
              <h2 className="font-heading font-extrabold text-base sm:text-lg text-white uppercase tracking-tight">
                San Roque Supermarket
              </h2>
              <p className="text-xs text-[#FFD166] font-medium">
                Retail Terminal Session Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD166] animate-pulse" />
            <span className="text-xs font-bold text-[#0D1B2A] bg-[#FFD166] px-2.5 py-1 rounded">
              ONLINE
            </span>
          </div>
        </div>

        {/* User & Terminal Profile Banner */}
        <div className="p-6 border-b border-[#1E3348] bg-[#122433] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/55 mb-1">
              <span>Authenticated Staff Account</span>
            </div>
            <h3 className="text-xl font-bold font-heading text-white">
              {username}
            </h3>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-[#1E3348]">
            <div className="flex items-center gap-1.5 text-xs text-white/55 font-mono">
              <Clock className="w-3.5 h-3.5 text-[#FFD166]" />
              <span className="tabular-nums font-semibold text-white">{time}</span>
            </div>
            <div className="text-[11px] text-[#FFD166] mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Shift Authorized</span>
            </div>
          </div>
        </div>

        {/* Inner Content Card (Neutral Light) */}
        <div className="p-6 bg-[#F7F4EF] text-[#212529]">
          {recentActionMsg && (
            <div className="mb-4 p-3 bg-[#FFF8E6] border border-[#F0D48A] rounded-lg text-xs font-semibold text-[#6A5420] flex items-center gap-2 animate-fade-in">
              <RefreshCw className="w-4 h-4 animate-spin text-[#E5383B]" />
              <span>{recentActionMsg}</span>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-heading font-bold text-sm text-[#0D1B2A] uppercase tracking-wide">
              Quick Retail Operations
            </h4>
            <span className="text-xs text-[#6E675E]">
              Station Status: <span className="font-semibold text-[#0D1B2A]">{activeLaneStatus}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleAction('POS Express Checkout Lane')}
              className="p-3.5 rounded-xl border border-[#E6E0D6] bg-[#FFFCF8] hover:border-[#E5383B] hover:shadow-md transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-lg bg-[#FDECEC] text-[#E5383B] group-hover:bg-[#E5383B] group-hover:text-white transition-colors">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-[#0D1B2A]">
                  POS Express Checkout
                </div>
                <div className="text-xs text-[#6E675E] mt-0.5">
                  Launch Lane Barcode & Tender Cashier
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAction('Inventory Price & Barcode Scanner')}
              className="p-3.5 rounded-xl border border-[#E6E0D6] bg-[#FFFCF8] hover:border-[#FFD166] hover:shadow-md transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-lg bg-[#FFF6DE] text-[#8A5A12] group-hover:bg-[#FFD166] group-hover:text-[#0D1B2A] transition-colors">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-[#0D1B2A]">
                  Barcode & Price Check
                </div>
                <div className="text-xs text-[#6E675E] mt-0.5">
                  SKU verification, promo lookup & tag audit
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAction('Stock In & Receiving Ledger')}
              className="p-3.5 rounded-xl border border-[#E6E0D6] bg-[#FFFCF8] hover:border-[#0D1B2A] hover:shadow-md transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-lg bg-[#E7EEF4] text-[#0D1B2A] group-hover:bg-[#0D1B2A] group-hover:text-[#FFD166] transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-[#0D1B2A]">
                  Receiving & Stock In
                </div>
                <div className="text-xs text-[#6E675E] mt-0.5">
                  Supplier purchase orders & pallet counts
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAction('Daily Cash Drawer & Z-Reading')}
              className="p-3.5 rounded-xl border border-[#E6E0D6] bg-[#FFFCF8] hover:border-[#E5383B] hover:shadow-md transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-lg bg-[#FDECEC] text-[#9B1C1E] group-hover:bg-[#E5383B] group-hover:text-white transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-[#0D1B2A]">
                  Z-Reading & Shift Audit
                </div>
                <div className="text-xs text-[#6E675E] mt-0.5">
                  Cash drop, reconciliation & manager signoff
                </div>
              </div>
            </button>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-[#E6E0D6] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#6E675E] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFD166]" />
              <span>Retail Server Synchronized with Manila Data Center</span>
            </div>
            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#E5383B] hover:bg-[#c92a2d] text-white font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>End Shift / Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
