import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { BranchLoadError, BranchSelect } from './BranchSelect';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const ConsignmentSales: React.FC = () => {
  const [searched, setSearched] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E0E0E0] bg-[#FFFFFF] px-3 py-6 shadow-sm sm:px-6">
      <form
        className="mx-auto w-full max-w-6xl"
        onSubmit={(event) => {
          event.preventDefault();
          setSearched(true);
        }}
      >
        <div className="grid grid-cols-1 gap-3 text-xs font-semibold text-[#212121] sm:grid-cols-2 xl:grid-cols-3">
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-branch">Branch</label>
            <BranchSelect id="consignment-branch" />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-status">Status</label>
            <select id="consignment-status" name="status" defaultValue="all" className="h-10 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm">
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-month">Month</label>
            <select id="consignment-month" name="month" defaultValue={months[new Date().getMonth()]} className="h-10 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm">
              {months.map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-year">Year</label>
            <select id="consignment-year" name="year" defaultValue={currentYear} className="h-10 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm">
              {[currentYear, currentYear - 1, currentYear - 2].map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-tin">Supplier TIN #</label>
            <input id="consignment-tin" name="supplierTin" type="text" className="h-10 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E53935] px-4 py-2 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#C62828] focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:ring-offset-2 sm:min-h-9">
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
          </div>
        </div>
        <BranchLoadError />
      </form>

      <div className="mt-6">
        <table className="stack-table w-full overflow-hidden rounded-xl border-collapse text-xs lg:table">
          <thead className="bg-[#212121] text-white">
            <tr>
              <th className="border border-white/15 px-3 py-3 text-left">Ref#</th>
              <th className="border border-white/15 px-3 py-3">Date</th>
              <th className="border border-white/15 px-3 py-3">Description</th>
              <th className="border border-white/15 px-3 py-3">Com.(%)</th>
              <th className="border border-white/15 px-3 py-3">Quantity</th>
              <th className="border border-white/15 px-3 py-3">CostOfSales</th>
              <th className="border border-white/15 px-3 py-3">Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#F4F6F9] font-semibold text-[#212121]">
              <td data-label={searched ? 'Result' : undefined} colSpan={3} className="border border-[#E0E0E0] px-3 py-3 text-sm text-[#616161]" aria-label={searched ? 'No consignment sales found' : 'No consignment sales'}>
                {searched ? 'No transactions found' : ''}
              </td>
              <td className="border border-[#E0E0E0] px-3 py-3 text-left font-semibold">TOTAL:</td>
              <td data-label="Quantity" className="border border-[#E0E0E0] px-3 py-3 text-right">0.00</td>
              <td data-label="CostOfSales" className="border border-[#E0E0E0] px-3 py-3 text-right">0.00</td>
              <td data-label="Sales" className="border border-[#E0E0E0] px-3 py-3 text-right">0.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
