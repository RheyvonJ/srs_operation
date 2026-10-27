import React, { useState } from 'react';
import { Search } from 'lucide-react';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const ConsignmentSales: React.FC = () => {
  const [searched, setSearched] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E6E0D6] bg-[#FFFCF8] px-4 py-6 shadow-sm sm:px-6">
      <form
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xs font-semibold text-[#0D1B2A]"
        onSubmit={(event) => {
          event.preventDefault();
          setSearched(true);
        }}
      >
        <label htmlFor="consignment-branch">Branch:</label>
        <select id="consignment-branch" name="branch" defaultValue="" className="h-9 min-w-36 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20">
          <option value="">Select Branch</option>
          <option value="nova">NOVA</option>
        </select>

        <label htmlFor="consignment-status">Status:</label>
        <select id="consignment-status" name="status" defaultValue="all" className="h-9 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>

        <label htmlFor="consignment-month">Month:</label>
        <select id="consignment-month" name="month" defaultValue={months[new Date().getMonth()]} className="h-9 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20">
          {months.map((month) => <option key={month} value={month}>{month}</option>)}
        </select>

        <label htmlFor="consignment-year">Year:</label>
        <select id="consignment-year" name="year" defaultValue={currentYear} className="h-9 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20">
          {[currentYear, currentYear - 1, currentYear - 2].map((year) => <option key={year} value={year}>{year}</option>)}
        </select>

        <label htmlFor="consignment-tin">Supplier TIN #:</label>
        <input id="consignment-tin" name="supplierTin" type="text" className="h-9 w-36 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20" />
        <button type="submit" className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#E5383B] px-4 py-2 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#c92a2d] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/30 focus:ring-offset-2">
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] overflow-hidden rounded-xl border-collapse text-xs">
          <thead className="bg-[#0D1B2A] text-white">
            <tr>
              <th className="border border-[#1E3348] px-3 py-3 text-left">Ref#</th>
              <th className="border border-[#1E3348] px-3 py-3">Date</th>
              <th className="border border-[#1E3348] px-3 py-3">Description</th>
              <th className="border border-[#1E3348] px-3 py-3">Com.(%)</th>
              <th className="border border-[#1E3348] px-3 py-3">Quantity</th>
              <th className="border border-[#1E3348] px-3 py-3">CostOfSales</th>
              <th className="border border-[#1E3348] px-3 py-3">Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#F7F4EF] font-semibold text-[#0D1B2A]">
              <td colSpan={3} className="border border-[#E6E0D6] px-3 py-3 text-sm text-[#6E675E]" aria-label={searched ? 'No consignment sales found' : 'No consignment sales'}>
                {searched ? 'No transactions found' : ''}
              </td>
              <th scope="row" className="border border-[#E6E0D6] px-3 py-3 text-left">TOTAL:</th>
              <td className="border border-[#E6E0D6] px-3 py-3 text-right">0.00</td>
              <td className="border border-[#E6E0D6] px-3 py-3 text-right">0.00</td>
              <td className="border border-[#E6E0D6] px-3 py-3 text-right">0.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
