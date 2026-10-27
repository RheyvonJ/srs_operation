import React, { useState } from 'react';
import { ShoppingCart, ShieldCheck, Store, Sparkles, Building2 } from 'lucide-react';

export const BrandHero: React.FC = () => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative flex h-full min-h-[660px] w-full flex-col justify-between overflow-hidden bg-[#0D1B2A] p-8 text-white xl:p-12">
      <div className="absolute inset-0 z-0">
        {!imageError ? (
          <img
            src="/san-roque-store.jpg"
            alt=""
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-[center_70%] brightness-75 contrast-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0D1B2A] via-[#163047] to-[#2A4460]">
            <Store className="h-32 w-32 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/75 to-[#0D1B2A]/40" />
        <div className="absolute inset-0 bg-[#0D1B2A]/30" />
      </div>

      <div className="relative z-10">
        <div className="mb-6 inline-flex items-center gap-3 rounded-md border border-white/10 bg-[#0D1B2A]/80 px-3.5 py-1.5 backdrop-blur-md">
          <div className="h-2.5 w-2.5 rounded-full bg-[#FFD166]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
            Enterprise Retail Cloud OS
          </span>
          <span className="text-white/40">·</span>
          <span className="text-xs font-medium text-[#FFD166]">v4.2.0 Production</span>
        </div>

        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E5383B] text-white shadow-lg shadow-[#E5383B]/30 ring-2 ring-[#FFD166]/40">
            <ShoppingCart className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-white xl:text-3xl">
              San Roque
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-[#FFD166]">
              Supermarket Retail Systems Inc.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 my-auto max-w-[480px] py-8">
        <div className="mb-3 inline-block">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFD166]">
            <Sparkles className="h-3.5 w-3.5" />
            Centralized Retail Operations
          </span>
        </div>
        <h2 className="mb-4 font-heading text-3xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-4xl">
          Powering Daily Supermarket Excellence & Checkout Speed
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-white/80 xl:text-base">
          Authorized terminal authentication for supermarket cashiers, inventory logisticians,
          and store management across all branches nationwide.
        </p>

        <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-[#0D1B2A]/85 p-4 backdrop-blur-md">
          <div>
            <div className="font-heading text-xl font-bold tabular-nums text-white xl:text-2xl">
              46+
            </div>
            <div className="text-[11px] font-medium text-white/65">Active Branches</div>
          </div>
          <div className="border-l border-white/10 pl-3">
            <div className="font-heading text-xl font-bold tabular-nums text-[#FFD166] xl:text-2xl">
              99.98%
            </div>
            <div className="text-[11px] font-medium text-white/65">POS Availability</div>
          </div>
          <div className="border-l border-white/10 pl-3">
            <div className="font-heading text-xl font-bold tabular-nums text-white xl:text-2xl">
              280k+
            </div>
            <div className="text-[11px] font-medium text-white/65">Daily Transactions</div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-[#FFD166]/25 pt-6 text-xs text-white/70">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#FFD166]" />
          <span>PCI-DSS & BIR POS Accredited</span>
        </div>
        <div className="flex items-center gap-1 text-white/55">
          <Building2 className="h-3.5 w-3.5" />
          <span>Metro Manila & Rizal Region</span>
        </div>
      </div>
    </div>
  );
};
