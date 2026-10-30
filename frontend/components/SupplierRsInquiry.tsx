import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { BranchLoadError, BranchSelect } from './BranchSelect';
import { DatePicker } from './DatePicker';
import { SearchSelect } from './SearchSelect';
import { rsSlipPath, type RsSlipTarget } from './bir2307Print';

interface SupplierOption {
  code: string;
  name: string;
}

interface SupplierRsLine {
  rsId: string;
  movementNo: number;
  rsDate: string;
  supplierName: string;
  extended: number;
  slip: RsSlipTarget | null;
}

const fieldClassName =
  'h-10 w-full min-w-0 rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm';

const connectionError = 'Could not load Supplier RS records. Please check the server connection.';

function formatExtended(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object' || !('message' in body)) return fallback;
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.join(' ');
  return fallback;
}

export const SupplierRsInquiry: React.FC = () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yearStart = `${now.getFullYear()}-01-01`;
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [suppliersReady, setSuppliersReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SupplierRsLine[]>([]);

  useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    let active = true;
    fetch(`${apiBaseUrl}/supplier-rs/suppliers`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as SupplierOption[] | null;
        if (!active || !response.ok || !Array.isArray(body)) return;
        setSuppliers(
          body.filter(
            (supplier) =>
              supplier &&
              typeof supplier.code === 'string' &&
              supplier.code.trim() &&
              typeof supplier.name === 'string',
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setSuppliersReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const search = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    const supplierCode = String(data.get('supplier') ?? '');
    setLoading(true);
    setError(null);
    setSearched(false);
    setRows([]);
    try {
      const response = await fetch(`${apiBaseUrl}/supplier-rs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchCode: String(data.get('branch') ?? ''),
          rsNumber: String(data.get('rsNumber') ?? ''),
          supplierCode: supplierCode === 'all' ? '' : supplierCode,
          from: String(data.get('from') ?? ''),
          to: String(data.get('to') ?? ''),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { rows?: SupplierRsLine[]; message?: unknown }
        | null;
      if (!response.ok || !body || !Array.isArray(body.rows)) {
        setError(messageFromBody(body, connectionError));
        return;
      }
      setRows(body.rows);
      setSearched(true);
    } catch {
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
            <label htmlFor="rs-branch">Branch</label>
            <BranchSelect id="rs-branch" />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="rs-number">RS#</label>
            <input id="rs-number" name="rsNumber" type="text" className={fieldClassName} />
          </div>
          <div className="grid min-w-0 gap-1 sm:col-span-2 xl:col-span-1">
            <label htmlFor="rs-supplier">Supplier</label>
            <SearchSelect
              id="rs-supplier"
              name="supplier"
              options={suppliers.map((supplier) => ({ value: supplier.code, label: supplier.name }))}
              emptyValue="all"
              emptyLabel="All Suppliers"
              placeholder="Search supplier"
              loading={!suppliersReady}
              loadingLabel="Loading suppliers..."
            />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="rs-from">Date From</label>
            <DatePicker id="rs-from" name="from" defaultValue={yearStart} />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="rs-to">Date To</label>
            <DatePicker id="rs-to" name="to" defaultValue={today} />
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
                <th className="border border-white/15 px-3 py-3 text-left">#</th>
                <th className="border border-white/15 px-3 py-3 text-left">SA to BO Date</th>
                <th className="border border-white/15 px-3 py-3 text-left">Supplier</th>
                <th className="border border-white/15 px-3 py-3 text-right">Extended</th>
                <th className="border border-white/15 px-3 py-3 text-left">Download Attachment</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-[#E0E0E0] px-3 py-4 text-center text-sm font-semibold text-[#616161]">
                    No transactions found
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.rsId} className="text-[#212121]">
                  <td data-label="#" className="border border-[#E0E0E0] px-3 py-3 font-semibold">#{row.movementNo}</td>
                  <td data-label="SA to BO Date" className="border border-[#E0E0E0] px-3 py-3">{row.rsDate}</td>
                  <td data-label="Supplier" className="border border-[#E0E0E0] px-3 py-3">{row.supplierName}</td>
                  <td data-label="Extended" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatExtended(row.extended)}</td>
                  <td data-label="Download Attachment" className="border border-[#E0E0E0] px-3 py-3">
                    {row.slip ? (
                      <a
                        href={rsSlipPath(row.slip)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#212121] underline"
                      >
                        Download RS Slip
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
