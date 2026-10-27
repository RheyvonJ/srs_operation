import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const PurchaseOrderForm: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E6E0D6] bg-[#FFFCF8] shadow-sm">
      <form
        className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xs font-semibold text-[#0D1B2A]">
          <label htmlFor="po-branch">Branch:</label>
          <select id="po-branch" name="branch" defaultValue="all" className="h-9 min-w-36 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20">
            <option value="all">All Branches</option>
            <option value="nova">NOVA</option>
          </select>
          <label htmlFor="po-from" className="sm:ml-1">From:</label>
          <input id="po-from" name="from" type="date" defaultValue={today} className="h-9 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20" />
          <label htmlFor="po-to">To:</label>
          <input id="po-to" name="to" type="date" defaultValue={today} className="h-9 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20" />
        </div>

        <div className="mx-auto mt-6 grid max-w-md grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-3 text-xs font-semibold text-[#0D1B2A]">
          <label htmlFor="po-supplier-tin" className="text-right">Supplier TIN #:</label>
          <input id="po-supplier-tin" name="supplierTin" type="text" className="h-9 min-w-0 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20" />
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#E5383B] px-5 py-2 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#c92a2d] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/30 focus:ring-offset-2">
            <CheckCircle2 className="h-4 w-4 text-[#FFD166]" />
            Display Purchase Order
          </button>
          {submitted && (
            <p role="status" className="rounded-xl border border-[#F0D48A] bg-[#FFF8E6] px-4 py-3 text-center text-xs font-medium text-[#6A5420]">
              Purchase Order records are not connected yet.
            </p>
          )}
        </div>
      </form>
    </section>
  );
};
