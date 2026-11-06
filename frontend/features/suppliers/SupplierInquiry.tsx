'use client';

import { useState } from 'react';

const headings = [
  '#', 'Type', 'Trxn #', 'Supplier', "Supplier's Reference", 'Other Reference', 'Comment',
  'Date', 'Due Date', 'Debit', 'Credit', 'GL', 'CV #', 'Print', 'Void',
];

const fieldClassName =
  'h-10 w-full min-w-0 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#212121] focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20';

export function SupplierInquiry() {
  const [searched, setSearched] = useState(false);

  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-[#E0E0E0] bg-white p-4 shadow-sm sm:p-6">
      <section aria-labelledby="supplier-balance-title" className="overflow-hidden rounded-xl border border-[#E0E0E0]">
        <div className="border-b border-[#EEEEEE] px-4 py-3">
          <h3 id="supplier-balance-title" className="text-sm font-bold text-[#212121]">Supplier balance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-[#F7F7F7] text-left text-xs font-semibold uppercase tracking-wide text-[#616161]">
              <tr>{['Currency', 'Terms', 'Current', '1-30 Days', '31-60 Days', 'Over 60 Days', 'Total Balance'].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody><tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-[#757575]">Select a supplier to view balances.</td></tr></tbody>
          </table>
        </div>
      </section>

      <form
        className="rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] p-4 sm:p-5"
        onSubmit={(event) => { event.preventDefault(); setSearched(true); }}
      >
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.3fr_1fr_1fr_1.2fr_auto]">
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#616161]">Reference #
            <input name="reference" className={fieldClassName} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#616161]">Supplier
            <select name="supplier" className={fieldClassName}><option value="">All Suppliers</option></select>
          </label>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#616161]">From
            <input name="from" type="date" className={fieldClassName} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#616161]">To
            <input name="to" type="date" className={fieldClassName} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#616161]">Transaction type
            <select name="filter" className={fieldClassName}>
              <option value="">All Transactions</option>
              <option>Invoices and deposits</option>
              <option>Supplier invoices</option>
              <option>Payments</option>
              <option>Credit notes</option>
              <option>Debit memos</option>
              <option>AP Trade</option>
              <option>AP Non-Trade</option>
            </select>
          </label>
          <button type="submit" className="h-10 rounded-lg bg-[#E53935] px-5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#C62828] focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:ring-offset-2">Search</button>
        </div>
      </form>

      <section aria-labelledby="supplier-transactions-title" className="overflow-hidden rounded-xl border border-[#E0E0E0]">
        <div className="border-b border-[#EEEEEE] px-4 py-3">
          <h3 id="supplier-transactions-title" className="text-sm font-bold text-[#212121]">Supplier transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="bg-[#212121] text-left text-xs font-semibold text-white">
              <tr>{headings.map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody><tr><td colSpan={headings.length} className="px-4 py-8 text-center text-sm text-[#757575]">
              {searched ? 'No transactions found.' : 'Enter search criteria and select Search.'}
            </td></tr></tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
