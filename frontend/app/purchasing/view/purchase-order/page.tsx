'use client';

import { useEffect, useState } from 'react';
import { purchaseOrderSignaturePath } from '../../../../components/bir2307Print';

interface PurchaseOrderItem {
  barcode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  extended: number;
}

interface PurchaseOrderDocument {
  companyName: string;
  branchAddress: string;
  branchTin: string;
  reference: string;
  transDate: string;
  validUntil: string;
  vendorName: string;
  vendorAddress: string;
  contactPerson: string;
  deliveryAddress: string;
  terms: string;
  lines: PurchaseOrderItem[];
  totalQuantity: number;
  grandTotal: number;
  remarks: string;
  preparedBy: string;
  preparedBySign: string;
  approvedBy: string;
  approvedBySign: string;
}

function money(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function messageFromBody(body: unknown): string {
  if (!body || typeof body !== 'object' || !('message' in body)) {
    return 'Could not load the purchase order. Please check the server connection.';
  }
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.join(' ');
  return 'Could not load the purchase order. Please check the server connection.';
}

function Signature({ file }: { file: string }) {
  const [visible, setVisible] = useState(Boolean(file));
  if (!file || !visible) return null;
  return (
    <img
      src={purchaseOrderSignaturePath(file)}
      alt=""
      onError={() => setVisible(false)}
      style={{ position: 'absolute', left: 8, bottom: 18, height: 48, maxWidth: 110, objectFit: 'contain' }}
    />
  );
}

export default function PurchaseOrderPage() {
  const [order, setOrder] = useState<PurchaseOrderDocument | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    let cancelled = false;
    document.title = 'Purchase Order';

    fetch(`${apiBaseUrl}/purchase-orders/print?${params.toString()}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as (PurchaseOrderDocument & { message?: unknown }) | null;
        if (!response.ok || !body || !Array.isArray(body.lines)) throw new Error(messageFromBody(body));
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        setOrder(body);
        document.title = body.reference ? `Purchase Order ${body.reference}` : 'Purchase Order';
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not load the purchase order. Please check the server connection.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p role="alert" style={{ margin: 24, fontFamily: 'Arial, sans-serif', color: '#D32F2F' }}>{error}</p>;
  }
  if (!order) {
    return <p style={{ margin: 24, fontFamily: 'Arial, sans-serif' }}>Loading purchase order...</p>;
  }

  return (
    <main style={{ boxSizing: 'border-box', maxWidth: 860, margin: '16px auto', padding: '0 16px 32px', color: '#111', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <style>{`
        @media print {
          .po-toolbar { display: none !important; }
          body { background: #fff; }
        }
      `}</style>
      <div className="po-toolbar" style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ border: 0, borderRadius: 8, background: '#E53935', color: '#fff', fontWeight: 700, padding: '8px 16px', cursor: 'pointer' }}
        >
          Print
        </button>
      </div>

      <header style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{order.companyName}</div>
          <div style={{ marginTop: 4 }}>{order.branchAddress}</div>
          <div style={{ marginTop: 4, fontWeight: 700 }}>{order.branchTin}</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Purchase Order</div>
          <div style={{ marginTop: 8 }}>No.</div>
          <div style={{ fontWeight: 700 }}>{order.reference}</div>
          <div style={{ marginTop: 8 }}>Date Created</div>
          <div style={{ fontWeight: 700 }}>{order.transDate}</div>
          <div style={{ marginTop: 8 }}>Valid Until</div>
          <div style={{ fontWeight: 700 }}>{order.validUntil}</div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16, marginTop: 20 }}>
        <div>
          <div>Vendor</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{order.vendorName}</div>
          <div>{order.vendorAddress}</div>
          <div>{order.contactPerson}</div>
        </div>
        <div>
          <div>Receive At</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{order.companyName}</div>
          <div>{order.deliveryAddress}</div>
          <div>{order.branchTin}</div>
        </div>
      </section>

      {order.terms && (
        <section style={{ marginTop: 16 }}>
          <div>Terms</div>
          <div style={{ fontWeight: 700 }}>{order.terms}</div>
        </section>
      )}

      <table style={{ width: '100%', marginTop: 18, borderCollapse: 'collapse', fontFamily: '"Courier New", Courier, monospace', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 6px' }}>Code</th>
            <th style={{ textAlign: 'left', padding: '4px 6px' }}>Particulars</th>
            <th style={{ textAlign: 'left', padding: '4px 6px' }}>UOM</th>
            <th style={{ textAlign: 'right', padding: '4px 6px' }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '4px 6px' }}>Price</th>
            <th style={{ textAlign: 'right', padding: '4px 6px' }}>Extended</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line, index) => (
            <tr key={`${line.barcode}-${index}`}>
              <td style={{ padding: '3px 6px' }}>{line.barcode}</td>
              <td style={{ padding: '3px 6px', fontWeight: 700 }}>{line.description}</td>
              <td style={{ padding: '3px 6px' }}>{line.unit}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right' }}>{money(line.quantity)}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right' }}>{money(line.unitPrice)}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right' }}>{money(line.extended)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32, marginTop: 16, fontWeight: 700, fontSize: 16 }}>
        <div>
          <div>Total Qty</div>
          <div style={{ textAlign: 'right' }}>{money(order.totalQuantity)}</div>
        </div>
        <div>
          <div>Grand Total</div>
          <div style={{ textAlign: 'right' }}>{money(order.grandTotal)}</div>
        </div>
      </div>

      <section style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700 }}>Remarks</div>
        <div style={{ marginTop: 4 }}>{order.remarks}</div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 48 }}>
        <div style={{ position: 'relative', minHeight: 72, border: '1px solid #111', padding: '28px 8px 8px' }}>
          <Signature file={order.preparedBySign} />
          <span>Prepared by: </span>
          <strong>{order.preparedBy}</strong>
        </div>
        <div style={{ position: 'relative', minHeight: 72, border: '1px solid #111', padding: '28px 8px 8px' }}>
          <span>Checked by: </span>
        </div>
        <div style={{ position: 'relative', minHeight: 72, border: '1px solid #111', padding: '28px 8px 8px' }}>
          <Signature file={order.approvedBySign} />
          <span>Approved by: </span>
          <strong>{order.approvedBy}</strong>
        </div>
      </section>
    </main>
  );
}
