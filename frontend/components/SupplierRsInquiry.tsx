import React from 'react';
import { Search } from 'lucide-react';
import { BranchLoadError, BranchSelect } from './BranchSelect';

export const SupplierRsInquiry: React.FC = () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E6E0D6] bg-[#FFFCF8] px-4 py-6 shadow-sm sm:px-6">
      <form
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xs font-semibold text-[#0D1B2A]"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label htmlFor="rs-branch">Branch:</label>
        <BranchSelect id="rs-branch" />

        <label htmlFor="rs-number">RS#:</label>
        <input id="rs-number" name="rsNumber" type="text" className="h-9 w-32 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20" />

        <label htmlFor="rs-supplier">Supplier:</label>
        <select id="rs-supplier" name="supplier" defaultValue="all" className="h-9 min-w-52 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20">
          <option value="all">All Suppliers</option>
        </select>

        <label htmlFor="rs-from">Date From:</label>
        <input id="rs-from" name="from" type="date" defaultValue={today} className="h-9 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20" />
        <label htmlFor="rs-to">Date To:</label>
        <input id="rs-to" name="to" type="date" defaultValue={today} className="h-9 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20" />

        <button type="submit" className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#E5383B] px-4 py-2 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#c92a2d] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/30 focus:ring-offset-2">
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
        <BranchLoadError />
      </form>

      <p role="status" className="mx-auto mt-8 max-w-md rounded-xl border border-[#E6E0D6] bg-[#F7F4EF] px-4 py-4 text-center font-heading text-sm font-bold text-[#0D1B2A]">
        No transactions found
      </p>
    </section>
  );
};
