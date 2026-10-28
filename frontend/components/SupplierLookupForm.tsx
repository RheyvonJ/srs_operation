import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BranchLoadError, BranchSelect } from './BranchSelect';
import { bir2307PrintPath, type Bir2307Target } from './bir2307Print';

interface SupplierLookupFormProps {
  documentName: string;
  includeCvNumber?: boolean;
  lookup?: 'cv';
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
  bir: Bir2307Target | null;
}

const inputClassName =
  'h-9 min-w-0 rounded-xl border border-[#E0D9CC] bg-white px-3 text-sm font-medium text-[#212529] shadow-xs focus:border-[#E5383B] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/20';

const connectionError = 'Could not load Supplier CV records. Please check the server connection.';

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function messageFromBody(body: unknown): string {
  if (!body || typeof body !== 'object' || !('message' in body)) return connectionError;
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.join(' ');
  return connectionError;
}

export const SupplierLookupForm: React.FC<SupplierLookupFormProps> = ({
  documentName,
  includeCvNumber = false,
  lookup,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SupplierCvLine[]>([]);
  const [total, setTotal] = useState(0);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const searchCv = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      const response = await fetch(`${apiBaseUrl}/supplier-cv/search`, {
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
        | { rows?: SupplierCvLine[]; total?: number; message?: unknown }
        | null;
      if (!response.ok || !body || !Array.isArray(body.rows)) {
        setError(messageFromBody(body));
        return;
      }
      setRows(body.rows);
      setTotal(typeof body.total === 'number' ? body.total : 0);
    } catch {
      setError(connectionError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E6E0D6] bg-[#FFFCF8] shadow-sm">
      <form
        className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (lookup === 'cv') {
            void searchCv(event.currentTarget);
          }
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xs font-semibold text-[#0D1B2A]">
          <label htmlFor="supplier-branch">Branch:</label>
          <BranchSelect id="supplier-branch" />

          <label htmlFor="supplier-from" className="sm:ml-2">From:</label>
          <input
            id="supplier-from"
            name="from"
            type="date"
            defaultValue={today}
            className={inputClassName}
          />
          <label htmlFor="supplier-to">To:</label>
          <input
            id="supplier-to"
            name="to"
            type="date"
            defaultValue={today}
            className={inputClassName}
          />
        </div>
        <BranchLoadError />

        <div className="mx-auto mt-6 grid max-w-md grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-3 text-xs font-semibold text-[#0D1B2A]">
          <label htmlFor="supplier-tin" className="text-right">Supplier TIN #:</label>
          <input id="supplier-tin" name="supplierTin" type="text" className={inputClassName} />
          <label htmlFor="supplier-invoice" className="text-right">Invoice Number:</label>
          <input id="supplier-invoice" name="invoiceNumber" type="text" className={inputClassName} />
          <label htmlFor="supplier-po" className="text-right">PO Number:</label>
          <input id="supplier-po" name="poNumber" type="text" className={inputClassName} />
          {includeCvNumber && (
            <>
              <label htmlFor="supplier-cv" className="text-right">CV Number:</label>
              <input id="supplier-cv" name="cvNumber" type="text" className={inputClassName} />
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#E5383B] px-5 py-2 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#c92a2d] focus:outline-none focus:ring-2 focus:ring-[#E5383B]/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-75"
          >
            <CheckCircle2 className="h-4 w-4 text-[#FFD166]" />
            {loading ? 'Loading...' : `Display ${documentName}`}
          </button>
          {lookup === 'cv' && error && (
            <p role="alert" className="rounded-xl border border-[#E5383B]/25 bg-[#FDECEC] px-4 py-3 text-center text-xs font-medium text-[#E5383B]">
              {error}
            </p>
          )}
          {lookup !== 'cv' && submitted && (
            <p role="status" className="rounded-xl border border-[#F0D48A] bg-[#FFF8E6] px-4 py-3 text-center text-xs font-medium text-[#6A5420]">
              {documentName} records are not connected yet.
            </p>
          )}
        </div>
      </form>

      {lookup === 'cv' && rows.length > 0 && (
        <div className="px-4 pb-6 sm:px-6">
          <h3 className="mb-3 text-center font-heading text-sm font-extrabold text-[#0D1B2A]">
            Supplier CV w/ Debit Memo List
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-xs">
              <thead className="bg-[#0D1B2A] text-white">
                <tr>
                  <th className="border border-[#1E3348] px-3 py-3 text-right" aria-label="Line" />
                  <th className="border border-[#1E3348] px-3 py-3 text-left">CV Date</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-left">Supplier Name</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-left">Reference</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-right">Amount</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-left">Invoice#</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-left">PO#</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-left">CV#</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-left">CSV Date</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-left">Due Date</th>
                  <th className="border border-[#1E3348] px-3 py-3 text-left">BIR 2307</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.line}-${row.reference}-${row.invoiceNumber}`} className="text-[#212529]">
                    <td className="border border-[#E6E0D6] px-3 py-3 text-right">{row.line}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3">{row.cvDate}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3">{row.supplierName}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3 font-semibold">{row.reference}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3 text-right">{formatAmount(row.amount)}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3">{row.invoiceNumber}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3">{row.poNumber}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3 font-semibold">{row.cvNumber}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3">{row.csvDate}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3">{row.dueDate}</td>
                    <td className="whitespace-nowrap border border-[#E6E0D6] px-3 py-3">
                      {row.bir ? (
                        <a
                          href={bir2307PrintPath(row.bir as Bir2307Target)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#0D1B2A] underline"
                        >
                          Print
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#F7F4EF] font-semibold text-[#880000]">
                  <td className="border border-[#E6E0D6] px-3 py-3" colSpan={3} />
                  <td className="border border-[#E6E0D6] px-3 py-3 text-right">TOTAL:</td>
                  <td className="border border-[#E6E0D6] px-3 py-3 text-right">{formatAmount(total)}</td>
                  <td className="border border-[#E6E0D6] px-3 py-3" colSpan={6} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
