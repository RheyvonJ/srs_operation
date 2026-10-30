import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { BranchLoadError, BranchSelect } from './BranchSelect';
import { DatePicker } from './DatePicker';
import { bir2307PrintPath, checkVoucherPath, cvViewPath, type Bir2307Target } from './bir2307Print';

interface SupplierLookupFormProps {
  documentName: string;
  includeCvNumber?: boolean;
  lookup?: 'cv' | 'apv';
}

interface SupplierApvLine {
  line: number;
  transDate: string;
  supplierName: string;
  amount: number;
  invoiceNumber: string;
  poNumber: string;
  bir: Bir2307Target | null;
}

interface SupplierCvLine {
  line: number;
  cvDate: string;
  supplierName: string;
  reference: string;
  amount: number;
  invoiceNumber: string;
  poNumber: string;
  cvNumber: string;
  csvDate: string;
  dueDate: string;
  cvId: number | null;
  branch: number | null;
  bir: Bir2307Target | null;
}

const inputClassName =
  'h-10 w-full min-w-0 rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm';

const cvConnectionError = 'Could not load Supplier CV records. Please check the server connection.';
const apvConnectionError = 'Could not load Supplier APV records. Please check the server connection.';

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object' || !('message' in body)) return fallback;
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.join(' ');
  return fallback;
}

export const SupplierLookupForm: React.FC<SupplierLookupFormProps> = ({
  documentName,
  includeCvNumber = false,
  lookup,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SupplierCvLine[]>([]);
  const [apvRows, setApvRows] = useState<SupplierApvLine[]>([]);
  const [total, setTotal] = useState(0);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const searchRecords = async (form: HTMLFormElement) => {
    if (lookup !== 'cv' && lookup !== 'apv') return;
    const data = new FormData(form);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    const fallback = lookup === 'apv' ? apvConnectionError : cvConnectionError;
    setLoading(true);
    setError(null);
    setSearched(false);
    setRows([]);
    setApvRows([]);
    try {
      const response = await fetch(`${apiBaseUrl}/supplier-${lookup}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchCode: String(data.get('branch') ?? ''),
          from: String(data.get('from') ?? ''),
          to: String(data.get('to') ?? ''),
          tin: String(data.get('supplierTin') ?? ''),
          invoiceNumber: String(data.get('invoiceNumber') ?? ''),
          poNumber: String(data.get('poNumber') ?? ''),
          cvNumber: String(data.get('cvNumber') ?? ''),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { rows?: SupplierCvLine[] | SupplierApvLine[]; total?: number; message?: unknown }
        | null;
      if (!response.ok || !body || !Array.isArray(body.rows)) {
        setError(messageFromBody(body, fallback));
        return;
      }
      if (lookup === 'apv') setApvRows(body.rows as SupplierApvLine[]);
      else setRows(body.rows as SupplierCvLine[]);
      setSearched(true);
      setTotal(typeof body.total === 'number' ? body.total : 0);
    } catch {
      setError(fallback);
    } finally {
      setLoading(false);
    }
  };

  const searchButton = (
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
  );

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E0E0E0] bg-[#FFFFFF] px-3 py-6 shadow-sm sm:px-6">
      <form
        className="mx-auto w-full max-w-6xl"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (lookup === 'cv' || lookup === 'apv') {
            void searchRecords(event.currentTarget);
          }
        }}
      >
        <div className="grid grid-cols-1 gap-3 text-xs font-semibold text-[#212121] sm:grid-cols-2 xl:grid-cols-3">
          <div className="grid min-w-0 gap-1">
            <label htmlFor="supplier-branch">Branch</label>
            <BranchSelect id="supplier-branch" />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="supplier-from">From</label>
            <DatePicker id="supplier-from" name="from" defaultValue={today} />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="supplier-to">To</label>
            <DatePicker id="supplier-to" name="to" defaultValue={today} />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="supplier-tin">Supplier TIN #</label>
            <input id="supplier-tin" name="supplierTin" type="text" className={inputClassName} />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="supplier-invoice">Invoice Number</label>
            <input id="supplier-invoice" name="invoiceNumber" type="text" className={inputClassName} />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="supplier-po">PO Number</label>
            <input id="supplier-po" name="poNumber" type="text" className={inputClassName} />
          </div>
          {includeCvNumber && (
            <div className="grid min-w-0 gap-1">
              <label htmlFor="supplier-cv">CV Number</label>
              <input id="supplier-cv" name="cvNumber" type="text" className={inputClassName} />
            </div>
          )}
          {searchButton}
        </div>
        <BranchLoadError />
      </form>

      {(lookup === 'cv' || lookup === 'apv') && error && (
        <p role="alert" className="mx-auto mt-6 max-w-xl rounded-xl border border-[#E53935]/25 bg-[#FFEBEE] px-4 py-3 text-center text-xs font-medium text-[#E53935]">
          {error}
        </p>
      )}
      {lookup !== 'cv' && lookup !== 'apv' && submitted && (
        <p role="status" className="mx-auto mt-6 max-w-xl rounded-xl border border-[#FFCC80] bg-[#FFF3E0] px-4 py-3 text-center text-xs font-medium text-[#E65100]">
          {documentName} records are not connected yet.
        </p>
      )}

      {lookup === 'cv' && searched && !error && (
        <div className="mt-6 overflow-x-auto">
          <table className="stack-table w-full border-collapse text-xs lg:table">
              <thead className="bg-[#212121] text-white">
                <tr>
                  <th className="border border-white/15 px-3 py-3 text-right" aria-label="Line" />
                  <th className="border border-white/15 px-3 py-3 text-left">CV Date</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Supplier Name</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Reference</th>
                  <th className="border border-white/15 px-3 py-3 text-right">Amount</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Invoice#</th>
                  <th className="border border-white/15 px-3 py-3 text-left">PO#</th>
                  <th className="border border-white/15 px-3 py-3 text-left">CV#</th>
                  <th className="border border-white/15 px-3 py-3 text-left">CSV Date</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Due Date</th>
                  <th className="border border-white/15 px-3 py-3 text-left">BIR 2307</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="border border-[#E0E0E0] px-3 py-4 text-center text-sm font-semibold text-[#616161]">
                      No transactions found
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={`${row.line}-${row.reference}-${row.invoiceNumber}`} className="text-[#212121]">
                    <td data-label="#" className="border border-[#E0E0E0] px-3 py-3 text-right font-semibold">{row.line}</td>
                    <td data-label="CV Date" className="border border-[#E0E0E0] px-3 py-3">{row.cvDate}</td>
                    <td data-label="Supplier Name" className="border border-[#E0E0E0] px-3 py-3">{row.supplierName}</td>
                    <td data-label="Reference" className="border border-[#E0E0E0] px-3 py-3 font-bold">
                      {row.cvId && row.branch !== null ? (
                        <a
                          href={cvViewPath(row.branch, row.cvId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#212121] underline"
                        >
                          {row.reference}
                        </a>
                      ) : (
                        row.reference
                      )}
                    </td>
                    <td data-label="Amount" className="border border-[#E0E0E0] px-3 py-3 text-right break-words">{formatAmount(row.amount)}</td>
                    <td data-label="Invoice#" className="border border-[#E0E0E0] px-3 py-3 break-words">{row.invoiceNumber}</td>
                    <td data-label="PO#" className="border border-[#E0E0E0] px-3 py-3 break-words">{row.poNumber}</td>
                    <td data-label="CV#" className="border border-[#E0E0E0] px-3 py-3 break-words font-semibold">
                      {row.cvNumber && row.branch !== null ? <a className="text-blue-700 underline" href={checkVoucherPath(row.branch, row.cvNumber)}>{row.cvNumber}</a> : row.cvNumber}
                    </td>
                    <td data-label="CSV Date" className="border border-[#E0E0E0] px-3 py-3 break-words">{row.csvDate}</td>
                    <td data-label="Due Date" className="border border-[#E0E0E0] px-3 py-3 break-words">{row.dueDate}</td>
                    <td data-label={row.bir ? 'BIR 2307' : ''} className="border border-[#E0E0E0] px-3 py-3 break-words">
                      {row.bir ? (
                        <a
                          href={bir2307PrintPath(row.bir as Bir2307Target)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#212121] underline"
                        >
                          Print
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#F4F6F9] font-semibold text-[#880000]">
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" colSpan={3} />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3 text-right">TOTAL:</td>
                  <td data-label="Amount" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(total)}</td>
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" colSpan={6} />
                </tr>
              </tbody>
            </table>
        </div>
      )}

      {lookup === 'apv' && searched && !error && (
        <div className="mt-6 overflow-x-auto">
          <table className="stack-table w-full border-collapse text-xs lg:table">
              <thead className="bg-[#212121] text-white">
                <tr>
                  <th className="border border-white/15 px-3 py-3 text-right" aria-label="Line" />
                  <th className="border border-white/15 px-3 py-3 text-left">Trans Date</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Supplier Name</th>
                  <th className="border border-white/15 px-3 py-3 text-right">Amount</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Invoice#</th>
                  <th className="border border-white/15 px-3 py-3 text-left">PO#</th>
                  <th className="border border-white/15 px-3 py-3 text-left">BIR 2307</th>
                </tr>
              </thead>
              <tbody>
                {apvRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="border border-[#E0E0E0] px-3 py-4 text-center text-sm font-semibold text-[#616161]">
                      No transactions found
                    </td>
                  </tr>
                )}
                {apvRows.map((row) => (
                  <tr key={`${row.line}-${row.invoiceNumber}-${row.poNumber}`} className="text-[#212121]">
                    <td data-label="#" className="border border-[#E0E0E0] px-3 py-3 text-right">{row.line}</td>
                    <td data-label="Trans Date" className="border border-[#E0E0E0] px-3 py-3">{row.transDate}</td>
                    <td data-label="Supplier Name" className="border border-[#E0E0E0] px-3 py-3">{row.supplierName}</td>
                    <td data-label="Amount" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(row.amount)}</td>
                    <td data-label="Invoice#" className="border border-[#E0E0E0] px-3 py-3">{row.invoiceNumber}</td>
                    <td data-label="PO#" className="border border-[#E0E0E0] px-3 py-3">{row.poNumber}</td>
                    <td data-label="BIR 2307" className="border border-[#E0E0E0] px-3 py-3">
                      {row.bir ? (
                        <a
                          href={bir2307PrintPath(row.bir)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#212121] underline"
                        >
                          Print
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#F4F6F9] font-semibold text-[#880000]">
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" colSpan={2} />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3 text-right">TOTAL:</td>
                  <td data-label="Amount" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(total)}</td>
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" colSpan={3} />
                </tr>
              </tbody>
            </table>
        </div>
      )}
    </section>
  );
};
