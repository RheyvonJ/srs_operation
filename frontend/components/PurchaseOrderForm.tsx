import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BranchLoadError, BranchSelect } from './BranchSelect';
import { purchaseOrderPrintPath, type PurchaseOrderPrintTarget } from './bir2307Print';

interface PurchaseOrderLine {
  line: number;
  supplierName: string;
  reference: string;
  orderNo: string;
  branchName: string;
  transDate: string;
  netTotal: number;
  emailStatus: 'Sent' | 'Pending';
  poStatus: string;
  print: PurchaseOrderPrintTarget;
  receivedDates: string;
  receivedTotal: number | null;
}

interface PurchaseOrderGroup {
  supplierId: string;
  supplierName: string;
  subtotal: number;
  rows: PurchaseOrderLine[];
}

const fieldClassName =
  'h-10 w-full min-w-0 rounded-xl border border-[#E0E0E0] bg-white px-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm';

const connectionError = 'Could not load Purchase Order records. Please check the server connection.';

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

function statusClass(status: string): string {
  if (status === 'Approved' || status === 'Sent') return 'font-semibold text-[#2E7D32]';
  if (status === 'Cancelled') return 'font-semibold text-[#E53935]';
  if (status === 'Expired' || status === 'Pending') return 'font-semibold text-[#ED6C02]';
  return '';
}

export const PurchaseOrderForm: React.FC = () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<PurchaseOrderGroup[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  const search = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    setLoading(true);
    setError(null);
    setGroups([]);
    setGrandTotal(0);
    try {
      const response = await fetch(`${apiBaseUrl}/purchase-orders/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchCode: String(data.get('branch') ?? ''),
          from: String(data.get('from') ?? ''),
          to: String(data.get('to') ?? ''),
          tin: String(data.get('supplierTin') ?? ''),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { groups?: PurchaseOrderGroup[]; grandTotal?: number; message?: unknown }
        | null;
      if (!response.ok || !body || !Array.isArray(body.groups)) {
        setError(messageFromBody(body, connectionError));
        return;
      }
      setGroups(body.groups);
      setGrandTotal(typeof body.grandTotal === 'number' ? body.grandTotal : 0);
    } catch {
      setError(connectionError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E0E0E0] bg-[#FFFFFF] shadow-sm">
      <form
        className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
        onSubmit={(event) => {
          event.preventDefault();
          void search(event.currentTarget);
        }}
      >
        <div className="grid grid-cols-1 gap-3 text-xs font-semibold text-[#212121] sm:grid-cols-3">
          <div className="grid min-w-0 gap-1">
            <label htmlFor="po-branch">Branch</label>
            <BranchSelect id="po-branch" emptyValue="all" emptyLabel="All Branches" />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="po-from">From</label>
            <input id="po-from" name="from" type="date" defaultValue={today} className={fieldClassName} />
          </div>
          <div className="grid min-w-0 gap-1">
            <label htmlFor="po-to">To</label>
            <input id="po-to" name="to" type="date" defaultValue={today} className={fieldClassName} />
          </div>
        </div>
        <BranchLoadError />

        <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-3 text-xs font-semibold text-[#212121] sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-center sm:gap-x-3">
          <label htmlFor="po-supplier-tin" className="sm:text-right">Supplier TIN #</label>
          <input id="po-supplier-tin" name="supplierTin" type="text" className={fieldClassName} />
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E53935] px-5 py-2 text-xs font-heading font-extrabold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#C62828] focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-75 sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4 text-white" />
            {loading ? 'Loading...' : 'Display Purchase Order'}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mx-auto mb-6 max-w-xl rounded-xl border border-[#E53935]/25 bg-[#FFEBEE] px-4 py-3 text-center text-xs font-medium text-[#E53935]">
          {error}
        </p>
      )}

      {groups.length > 0 && (
        <div className="border-t border-[#E0E0E0] px-3 py-6 sm:px-6">
          <h3 className="font-heading text-sm font-extrabold uppercase tracking-wide text-[#212121]">
            Purchase Order List
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="stack-table w-full border-collapse text-xs lg:min-w-[960px] lg:table">
              <thead className="bg-[#212121] text-white">
                <tr>
                  <th className="border border-white/15 px-3 py-3 text-right">#</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Supplier Name</th>
                  <th className="border border-white/15 px-3 py-3 text-left">P.O. Reference</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Order No.</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Branch</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Date Created</th>
                  <th className="border border-white/15 px-3 py-3 text-right">Net Total</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Email Status</th>
                  <th className="border border-white/15 px-3 py-3 text-left">P.O. Status</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Print</th>
                  <th className="border border-white/15 px-3 py-3 text-left">Date Received</th>
                  <th className="border border-white/15 px-3 py-3 text-right">Received Total</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <React.Fragment key={`${group.supplierId}-${group.rows[0]?.line ?? group.supplierName}`}>
                    {group.rows.map((row) => (
                      <tr key={`${row.orderNo}-${row.reference}-${row.line}`} className="text-[#212121]">
                        <td data-label="#" className="border border-[#E0E0E0] px-3 py-3 text-right font-semibold">{row.line}</td>
                        <td data-label="Supplier Name" className="border border-[#E0E0E0] px-3 py-3">{row.supplierName}</td>
                        <td data-label="P.O. Reference" className="border border-[#E0E0E0] px-3 py-3">{row.reference}</td>
                        <td data-label="Order No." className="border border-[#E0E0E0] px-3 py-3">{row.orderNo}</td>
                        <td data-label="Branch" className="border border-[#E0E0E0] px-3 py-3">{row.branchName}</td>
                        <td data-label="Date Created" className="border border-[#E0E0E0] px-3 py-3">{row.transDate}</td>
                        <td data-label="Net Total" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(row.netTotal)}</td>
                        <td data-label="Email Status" className={`border border-[#E0E0E0] px-3 py-3 ${statusClass(row.emailStatus)}`}>{row.emailStatus}</td>
                        <td data-label="P.O. Status" className={`border border-[#E0E0E0] px-3 py-3 ${statusClass(row.poStatus)}`}>{row.poStatus}</td>
                        <td data-label="Print" className="border border-[#E0E0E0] px-3 py-3">
                          <a
                            href={purchaseOrderPrintPath(row.print)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[#212121] underline"
                          >
                            Print
                          </a>
                        </td>
                        <td data-label="Date Received" className="border border-[#E0E0E0] px-3 py-3 text-center">{row.receivedDates}</td>
                        <td data-label="Received Total" className="border border-[#E0E0E0] px-3 py-3 text-right">
                          {row.receivedTotal == null ? '-' : formatAmount(row.receivedTotal)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#F4F6F9] font-semibold text-[#212121]">
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3 text-right">Sub Total</td>
                      <td data-label="Sub Total" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(group.subtotal)}</td>
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                      <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="bg-[#FFEBEE] font-heading font-extrabold text-[#212121]">
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3 text-right">Grand Total</td>
                  <td data-label="Grand Total" className="border border-[#E0E0E0] px-3 py-3 text-right">{formatAmount(grandTotal)}</td>
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                  <td data-label="" className="border border-[#E0E0E0] px-3 py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
