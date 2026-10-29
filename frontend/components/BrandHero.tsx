import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, ShieldCheck, Store, Sparkles, Building2, MapPin, Users, Layers, Briefcase } from 'lucide-react';

const recordHighlights = [
  { title: 'Branches Covered', icon: MapPin },
  { title: 'Supplier Records', icon: Users },
  { title: 'Data Categories', icon: Layers },
  { title: 'Business Records', icon: Briefcase },
] as const;

export const BrandHero: React.FC = () => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative flex h-full min-h-[660px] w-full flex-col justify-between overflow-hidden bg-[#212121] p-8 text-white xl:p-12">
      <div className="absolute inset-0 z-0">
        {!imageError ? (
          <Image
            src="/san-roque-store.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            onError={() => setImageError(true)}
            className="object-cover object-[center_70%] brightness-75 contrast-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#212121] via-[#2C2C2C] to-[#424242]">
            <Store className="h-32 w-32 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#212121] via-[#212121]/75 to-[#212121]/40" />
        <div className="absolute inset-0 bg-[#212121]/30" />
      </div>

      <div className="relative z-10">
        <div className="mb-6 inline-flex items-center gap-3 rounded-md border border-white/10 bg-[#212121]/80 px-3.5 py-1.5 backdrop-blur-md">
          <div className="h-2.5 w-2.5 rounded-full bg-[#2E7D32]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
            Enterprise Data Viewing Portal
          </span>
          <span className="text-white/40">·</span>
          <span className="text-xs font-medium text-white/70">v1.0.0 production </span>
        </div>

        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E53935] text-white shadow-lg shadow-[#E53935]/30 ring-2 ring-white/30">
            <ShoppingCart className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-white xl:text-3xl">
              San Roque
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">
              Supermarket Retail Systems Inc.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 my-auto max-w-[480px] py-8">
        <div className="mb-3 inline-block">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E53935]">
            <Sparkles className="h-3.5 w-3.5" />
            Company Information & Business Records
          </span>
        </div>
        <h2 className="mb-4 font-heading text-3xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-4xl">
          Centralizing Company Data for Faster, Easier Access
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-white/80 xl:text-base">
          A secure information portal for authorized personnel to view company records, including supplier details, 
          branch information, TIN numbers, CV records, and other essential business data.
        </p>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-[#212121]/85 p-4 backdrop-blur-md">
          {recordHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E53935]/15 text-[#E53935]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="font-heading text-[13px] font-bold leading-tight text-white">{item.title}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-6 text-xs text-white/70">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#E53935]" />
          <span>Authorized Personnel Access</span>
        </div>
        <div className="flex items-center gap-1 text-white/55">
          <Building2 className="h-3.5 w-3.5" />
          <span>SRS NOVA</span>
        </div>
      </div>
    </div>
  );
};
