import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { BranchLoadError, BranchSelect } from './BranchSelect';
import { consignmentPrintPath, type ConsignmentPrintTarget } from './bir2307Print';

interface ConsignmentLine {
  line: number;
  reference: string;
  period: string;
  description: string;
  commissionPercent: number;
  quantity: number;
  costOfSales: number;
  sales: number;
  print: ConsignmentPrintTarget;
}

interface ConsignmentTotals {
  quantity: number;
  costOfSales: number;
  sales: number;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const fieldClassName =
  'h-10 w-full min-w-0 rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm';

const connectionError = 'Could not load Consignment Sales records. Please check the server connection.';
const emptyTotals: ConsignmentTotals = { quantity: 0, costOfSales: 0, sales: 0 };

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(amount: number): string {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object' || !('message' in body)) return fallback;
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.join(' ');
  return fallback;
}

export const ConsignmentSales: React.FC = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const firstYear = 2025;
  const years = Array.from(
    { length: Math.max(currentYear, firstYear) - firstYear + 1 },
    (_, index) => Math.max(currentYear, firstYear) - index,
  );
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ConsignmentLine[]>([]);
  const [totals, setTotals] = useState<ConsignmentTotals>(emptyTotals);

  const search = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    setLoading(true);
    setError(null);
    setRows([]);
    setTotals(emptyTotals);
    try {
      const response = await fetch(`${apiBaseUrl}/consignment-sales/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchCode: String(data.get('branch') ?? ''),
          status: String(data.get('status') ?? 'all'),
          month: String(data.get('month') ?? ''),
          year: String(data.get('year') ?? ''),
          tin: String(data.get('supplierTin') ?? ''),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { rows?: ConsignmentLine[]; totals?: ConsignmentTotals; message?: unknown }
        | null;
      if (!response.ok || !body || !Array.isArray(body.rows) || !body.totals) {
        setSearched(false);
        setError(messageFromBody(body, connectionError));
        return;
      }
      setRows(body.rows);
      setTotals(body.totals);
      setSearched(true);
    } catch {
      setSearched(false);
      setError(connectionError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E0E0E0] bg-[#FFFFFF] px-3 py-6 shadow-sm sm:px-6">
      <form
        className="mx-auto w-full max-w-6xl"
        onSubmit={(event) => {
          event.preventDefault();
          void search(event.currentTarget);
        }}
      >
        <div className="grid grid-cols-1 gap-3 text-xs font-semibold text-[#212121] sm:grid-cols-2 xl:grid-cols-3">
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-branch">Branch</label>
            <BranchSelect id="consignment-branch" />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-status">Status</label>
            <select id="consignment-status" name="status" defaultValue="all" className={fieldClassName}>
              <option value="all">All</option>
              <option value="with-cv">With CV</option>
              <option value="without-cv">Without CV</option>
            </select>
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-month">Month</label>
            <select
              id="consignment-month"
              name="month"
              defaultValue={String(now.getMonth() + 1)}
              className={fieldClassName}
            >
              {months.map((month, index) => (
                <option key={month} value={String(index + 1)}>{month}</option>
              ))}
            </select>
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-year">Year</label>
            <select id="consignment-year" name="year" defaultValue={currentYear} className={fieldClassName}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="consignment-tin">Supplier TIN #</label>
            <input id="consignment-tin" name="supplierTin" type="text" className={fieldClassName} />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E53935] px-4 py-2 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#C62828] focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-75 sm:min-h-9"
            >
              <Search className="h-3.5 w-3.5" />
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>
        </div>
        <BranchLoadError />
      </form>

      {error && (
        <p role="alert" className="mx-auto mt-6 max-w-xl rounded-xl border border-[#E53935]/25 bg-[#FFEBEE] px-4 py-3 text-center text-xs font-medium text-[#E53935]">
          {error}
        </p>
      )}

      {searched && !error && (
        <div className="mt-6 overflow-x-auto">
          <table className="stack-table w-full border-collapse text-xs lg:table">
            <thead className="bg-[#212121] text-white">
              <tr>
                <th className="border border-white/15 px-3 py-3 text-right">#</th>
                <th className="border border-white/15 px-3 py-3 text-left">Ref#</th>
                <th className="border border-white/15 px-3 py-3 text-left">Date</th>
                <th className="border border-white/15 px-3 py-3 text-left">Description</th>
                <th className="border border-white/15 px-3 py-3 text-right">Com.(%)</th>
                <th className="border border-white/15 px-3 py-3 text-right">Quantity</th>
                <th className="border border-white/15 px-3 py-3 text-right">CostOfSales</th>
                <th className="border border-white/15 px-3 py-3 text-right">Sales</th>
                <th className="border border-white/15 px-3 py-3 text-left">Print</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="border border-[#E0E0E0] px-3 py-4 text-center text-sm font-semibold text-[#616161]">
                    No transactions found
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.reference} className="text-[#212121]">
                  <td data-label="#" className="border border-[#E0E0E0] px-3 py-3 text-right font-semibold">{row.line}</td>
                  <td data-label="Ref#" className="border border-[#E0E0E0] px-3 py-3 font-bold">{row.reference}</td>
                  <td data-label="Date" className="border border-[#E0E0E0] px-3 py-3 text-center font-bold">{row.period}</td>
                  <td data-label="Description" className="border border-[#E0E0E0] px-3 py-3">{row.description}</td>
                  <td data-label="Com.(%)" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatPercent(row.commissionPercent)}</td>
                  <td data-label="Quantity" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(row.quantity)}</td>
                  <td data-label="CostOfSales" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(row.costOfSales)}</td>
                  <td data-label="Sales" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(row.sales)}</td>
                  <td data-label="Print" className="border border-[#E0E0E0] px-3 py-3">
                    <a
                      href={consignmentPrintPath(row.print)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#212121] underline"
                    >
                      Print
                    </a>
                  </td>
                </tr>
              ))}
              <tr className="bg-[#F4F6F9] font-semibold text-[#880000]">
                <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                <td data-label="" className="border border-[#E0E0E0] px-3 py-3 text-right">TOTAL:</td>
                <td data-label="Quantity" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(totals.quantity)}</td>
                <td data-label="CostOfSales" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(totals.costOfSales)}</td>
                <td data-label="Sales" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(totals.sales)}</td>
                <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
