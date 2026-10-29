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
      <div className="bg-[#212121] text-white rounded-2xl shadow-2xl shadow-[#212121]/20 border border-[#212121] overflow-hidden">
        {/* Header Ribbon */}
        <div className="relative bg-[#212121] px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E53935]" />
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
              <p className="text-xs text-[#A5D6A7] font-medium">
                Retail Terminal Session Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-pulse" />
            <span className="text-xs font-bold text-white bg-[#2E7D32] px-2.5 py-1 rounded">
              ONLINE
            </span>
          </div>
        </div>

        {/* User & Terminal Profile Banner */}
        <div className="p-6 border-b border-white/10 bg-[#1E1E1E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/55 mb-1">
              <span>Authenticated Staff Account</span>
            </div>
            <h3 className="text-xl font-bold font-heading text-white">
              {username}
            </h3>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-white/55 font-mono">
              <Clock className="w-3.5 h-3.5 text-[#0288D1]" />
              <span className="tabular-nums font-semibold text-white">{time}</span>
            </div>
            <div className="text-[11px] text-[#A5D6A7] mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Shift Authorized</span>
            </div>
          </div>
        </div>

        {/* Inner Content Card (Neutral Light) */}
        <div className="p-6 bg-[#F4F6F9] text-[#212121]">
          {recentActionMsg && (
            <div className="mb-4 p-3 bg-[#FFF3E0] border border-[#FFCC80] rounded-lg text-xs font-semibold text-[#E65100] flex items-center gap-2 animate-fade-in">
              <RefreshCw className="w-4 h-4 animate-spin text-[#E53935]" />
              <span>{recentActionMsg}</span>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-heading font-bold text-sm text-[#212121] uppercase tracking-wide">
              Quick Retail Operations
            </h4>
            <span className="text-xs text-[#616161]">
              Station Status: <span className="font-semibold text-[#212121]">{activeLaneStatus}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleAction('POS Express Checkout Lane')}
              className="p-3.5 rounded-xl border border-[#E0E0E0] bg-[#FFFFFF] hover:border-[#E53935] hover:shadow-md transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-lg bg-[#FFEBEE] text-[#E53935] group-hover:bg-[#E53935] group-hover:text-white transition-colors">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-[#212121]">
                  POS Express Checkout
                </div>
                <div className="text-xs text-[#616161] mt-0.5">
                  Launch Lane Barcode & Tender Cashier
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAction('Inventory Price & Barcode Scanner')}
              className="p-3.5 rounded-xl border border-[#E0E0E0] bg-[#FFFFFF] hover:border-[#ED6C02] hover:shadow-md transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-lg bg-[#FFF3E0] text-[#ED6C02] group-hover:bg-[#ED6C02] group-hover:text-white transition-colors">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-[#212121]">
                  Barcode & Price Check
                </div>
                <div className="text-xs text-[#616161] mt-0.5">
                  SKU verification, promo lookup & tag audit
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAction('Stock In & Receiving Ledger')}
              className="p-3.5 rounded-xl border border-[#E0E0E0] bg-[#FFFFFF] hover:border-[#212121] hover:shadow-md transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-lg bg-[#E1F5FE] text-[#0288D1] group-hover:bg-[#0288D1] group-hover:text-white transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-[#212121]">
                  Receiving & Stock In
                </div>
                <div className="text-xs text-[#616161] mt-0.5">
                  Supplier purchase orders & pallet counts
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAction('Daily Cash Drawer & Z-Reading')}
              className="p-3.5 rounded-xl border border-[#E0E0E0] bg-[#FFFFFF] hover:border-[#E53935] hover:shadow-md transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-lg bg-[#FFEBEE] text-[#D32F2F] group-hover:bg-[#E53935] group-hover:text-white transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-[#212121]">
                  Z-Reading & Shift Audit
                </div>
                <div className="text-xs text-[#616161] mt-0.5">
                  Cash drop, reconciliation & manager signoff
                </div>
              </div>
            </button>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-[#E0E0E0] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#616161] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
              <span>Retail Server Synchronized with Manila Data Center</span>
            </div>
            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#E53935] hover:bg-[#C62828] text-white font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors"
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
