import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BranchLoadError, BranchSelect } from './BranchSelect';

export const PurchaseOrderForm: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E0E0E0] bg-[#FFFFFF] shadow-sm">
      <form
        className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="grid grid-cols-1 gap-3 text-xs font-semibold text-[#212121] sm:grid-cols-3">
          <div className="grid min-w-0 gap-1">
            <label htmlFor="po-branch">Branch</label>
            <BranchSelect id="po-branch" emptyValue="all" emptyLabel="All Branches" />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="po-from">From</label>
            <input id="po-from" name="from" type="date" defaultValue={today} className="h-10 w-full min-w-0 rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm" />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="po-to">To</label>
            <input id="po-to" name="to" type="date" defaultValue={today} className="h-10 w-full min-w-0 rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm" />
          </div>
        </div>
        <BranchLoadError />

        <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-3 text-xs font-semibold text-[#212121] sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-center sm:gap-x-3">
          <label htmlFor="po-supplier-tin" className="sm:text-right">Supplier TIN #</label>
          <input id="po-supplier-tin" name="supplierTin" type="text" className="h-10 w-full min-w-0 rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm" />
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E53935] px-5 py-2 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#C62828] focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:ring-offset-2 sm:w-auto">
            <CheckCircle2 className="h-4 w-4 text-white" />
            Display Purchase Order
          </button>
          {submitted && (
            <p role="status" className="rounded-xl border border-[#FFCC80] bg-[#FFF3E0] px-4 py-3 text-center text-xs font-medium text-[#E65100]">
              Purchase Order records are not connected yet.
            </p>
          )}
        </div>
      </form>
    </section>
  );
};
