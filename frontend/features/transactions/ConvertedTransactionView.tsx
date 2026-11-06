'use client';

import { useEffect, useState } from 'react';

const views: Record<string, { endpoint: string; title: string; numberKeys: string[] }> = {
  'gl-trans': { endpoint: 'gl', title: 'General Ledger Transaction', numberKeys: ['trans_no', 'trans_no'] },
  'gl-payment': { endpoint: 'bank', title: 'GL Payment', numberKeys: ['trans_no', 'type_id'] },
  'gl-deposit': { endpoint: 'bank', title: 'GL Deposit', numberKeys: ['trans_no', 'type_id'] },
  'bank-transfer': { endpoint: 'bank', title: 'Bank Transfer', numberKeys: ['trans_no', 'type_id'] },
  'check-batch': { endpoint: 'check-batch', title: 'Check Issuance Batch', numberKeys: ['id', 'id'] },
  csv: { endpoint: 'csv', title: 'CSV Export Batch', numberKeys: ['trans_no', 'id'] },
  'purchase-order': { endpoint: 'purchase-order', title: 'Purchase Order', numberKeys: ['trans_no', 'order_no'] },
  'discrepancy-po': { endpoint: 'discrepancy-po', title: 'Purchase Order Discrepancy', numberKeys: ['trans_no', 'order_no'] },
  grn: { endpoint: 'grn', title: 'Goods Received Note', numberKeys: ['trans_no', 'id'] },
  'supplier-credit': { endpoint: 'supplier-credit', title: 'Supplier Credit Note', numberKeys: ['trans_no', 'trans_no'] },
  rs: { endpoint: 'rs', title: 'Returned Merchandise Slip', numberKeys: ['rs_id', 'rs_id'] },
  'rs-slip': { endpoint: 'rs-slip', title: 'Returned Merchandise Slip', numberKeys: ['rs_id', 'rs_id'] },
  movement: { endpoint: 'movement', title: 'Returned Merchandise Movement', numberKeys: ['rs_id', 'rs_id'] },
};

function label(key: string) { return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase()); }
function Value({ value }: { value: unknown }) {
  if (value == null || typeof value !== 'object') return <>{typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value ?? '')}</>;
  if (Array.isArray(value)) {
    if (!value.length) return <span>None</span>;
    if (typeof value[0] !== 'object' || value[0] === null) return <ul style={{ margin: 0, paddingLeft: 20 }}>{value.map((item, index) => <li key={index}><Value value={item}/></li>)}</ul>;
    const columns = Object.keys(value[0]);
    return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 16px' }}><thead><tr>{columns.map((key) => <th key={key} style={th}>{label(key)}</th>)}</tr></thead><tbody>{value.map((row, i) => <tr key={i}>{columns.map((key) => <td key={key} style={td}><Value value={(row as Record<string, unknown>)[key]}/></td>)}</tr>)}</tbody></table></div>;
  }
  return <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 210px) 1fr', gap: '6px 12px', margin: 0 }}>{Object.entries(value as Record<string, unknown>).map(([key, cell]) => <Fragment key={key} label={label(key)} value={cell}/>)}</dl>;
}
function Fragment({ label: name, value }: { label: string; value: unknown }) { return <><dt style={{ fontWeight: 600 }}>{name}</dt><dd style={{ margin: 0 }}><Value value={value}/></dd></>; }
const th: React.CSSProperties = { textAlign: 'left', border: '1px solid #bbb', padding: 6, background: '#eee' };
const td: React.CSSProperties = { border: '1px solid #bbb', padding: 6 };

function receiptAmount(value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    : String(value ?? '');
}

function RsSlip({ record }: { record: Record<string, unknown> }) {
  const items = Array.isArray(record.items) ? record.items : [];
  const columns: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 3ch 3ch 7ch 8ch',
    columnGap: 2,
    alignItems: 'center',
  };
  const valueStyle: React.CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' };

  return <>
    <header style={{ textAlign: 'center', marginBottom: 18 }}>
      <strong>{String(record.companyName ?? '')}</strong><br /><br />
      Return to Supplier Slip<br />RS # : {String(record.movementNo ?? '')}
    </header>
    <p style={{ margin: '0 0 12px' }}>
      Supplier :<br />{String(record.supplierName ?? '')}<br /><br />
      Date : {String(record.date ?? '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3/$1')}<br />
      SA to BO # : {String(record.saToBo ?? record.rsId ?? '')}
      {record.remarks ? <><br />Remarks : {String(record.remarks)}</> : null}
    </p>
    <div style={{ fontSize: 11 }}>
      <div style={{ textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>----------------------------------------</div>
      <div style={{ height: 12 }} />
      <div style={{ ...columns, marginBottom: 6 }}>
        <span>PRODUCT</span><span>UOM</span><span>QTY</span><span style={valueStyle}>UCOST</span><span style={valueStyle}>EXTENDED</span>
      </div>
      {items.map((value, index) => {
        const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
        return <div key={index} style={{ ...columns, marginBottom: 4 }}>
          <span style={{ overflowWrap: 'anywhere' }}>{String(item.itemName ?? '')}</span>
          <span>{String(item.uom ?? '')}</span>
          <span style={valueStyle}>{String(item.quantity ?? '')}</span>
          <span style={valueStyle}>{receiptAmount(item.price)}</span>
          <span style={valueStyle}>{receiptAmount(item.amount)}</span>
        </div>;
      })}
      <div style={{ textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>----------------------------------------</div>
    </div>
    <p style={{ textAlign: 'center', margin: '10px 0' }}>TOTAL: {receiptAmount(record.total)}</p>
    <div style={{ textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>----------------------------------------</div>
    <style>{'@media print { body { margin: 0; } main { box-sizing: border-box; width: 74mm !important; margin: 0 auto !important; padding: 2mm !important; } }'}</style>
  </>;
}

function RsView({ record }: { record: Record<string, unknown> }) {
  const items = Array.isArray(record.items) ? record.items : [];
  const action = String(record.action ?? 'Return to Supplier');
  return <main style={{ boxSizing: 'border-box', maxWidth: 900, margin: '20px auto', padding: '16px 24px', color: '#222', font: '13px Arial, sans-serif' }}>
    <header style={{ textAlign: 'center', marginBottom: 24 }}>
      <strong>{String(record.companyName ?? '')}</strong><br />
      {String(record.companyAddress ?? '')}
      <h1 style={{ margin: '22px 0 0', fontSize: 16 }}>{action} Slip #{String(record.movementNo ?? '')}</h1>
    </header>
    <table style={{ width: '90%', margin: '0 auto 40px', borderCollapse: 'collapse' }}><tbody>
      <tr><th style={rsLabel}>Supplier</th><td style={rsCell}>{String(record.supplierName ?? '')}</td><th style={rsLabel}>Date:</th><td style={rsCell}>{String(record.date ?? '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3/$1')}</td></tr>
      <tr><th style={rsLabel}>Status :</th><td style={{ ...rsCell, fontWeight: 700 }}>{String(record.status ?? '')}</td>{record.status === 'PENDING' ? <td style={rsCell} colSpan={2} /> : <><th style={rsLabel}>SA to BO Slip # :</th><td style={{ ...rsCell, fontWeight: 700 }}>{String(record.saToBo ?? record.rsId ?? '')}</td></>}</tr>
    </tbody></table>
    {record.remarks ? <p style={{ width: '90%', margin: '0 auto 20px' }}><strong>Remarks:</strong> {String(record.remarks)}</p> : null}
    <div style={{ textAlign: 'center', fontWeight: 700 }}>Items</div>
    <table style={{ width: '90%', margin: '0 auto', borderCollapse: 'collapse' }}>
      <thead><tr>{['Product', 'QTY', 'UOM', 'PRICE', 'AMOUNT'].map((heading) => <th key={heading} style={rsHeading}>{heading}</th>)}</tr></thead>
      <tbody>{items.map((value, index) => {
        const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
        return <tr key={index}><td style={rsCell}>{String(item.itemName ?? '')}</td><td style={{ ...rsCell, textAlign: 'right' }}>{String(item.quantity ?? '')}</td><td style={rsCell}>{String(item.uom ?? '')}</td><td style={{ ...rsCell, textAlign: 'right' }}>{receiptAmount(item.price)}</td><td style={{ ...rsCell, textAlign: 'right' }}>{receiptAmount(item.amount)}</td></tr>;
      })}</tbody>
      <tfoot><tr><td style={rsCell} colSpan={3} /><th style={{ ...rsCell, textAlign: 'right' }}>TOTAL:</th><th style={{ ...rsCell, textAlign: 'right' }}>{receiptAmount(record.total)}</th></tr></tfoot>
    </table>
  </main>;
}

const rsCell = { border: '1px solid #ccc', padding: '5px 6px' };
const rsLabel = { ...rsCell, width: '12%', background: '#d15705', color: '#fff', textAlign: 'left' as const };
const rsHeading = { ...rsCell, background: '#d15705', color: '#fff', textAlign: 'center' as const };

type Query = Record<string, string | string[] | undefined>;
export default function ConvertedTransactionView({ view, query: source }: { view: string; query: Query }) {
  const [data, setData] = useState<unknown>();
  const [error, setError] = useState('');
  const config = views[view];
  useEffect(() => {
    let cancelled = false;
    if (!config) return;
    const branch = String(source.branch ?? '');
    const id = config.numberKeys.map((key) => source[key]).find(Boolean);
    if (!branch || !id) return;
    const query = new URLSearchParams({ branch });
    if (config.endpoint === 'gl' || config.endpoint === 'bank') {
      const type = source.type_id ?? (view === 'gl-payment' ? '1' : view === 'gl-deposit' ? '2' : '4');
      query.set('type_id', String(type)); query.set('trans_no', String(id));
    } else if (view === 'rs' || view === 'rs-slip' || view === 'movement') query.set('rs_id', String(id));
    else if (view === 'check-batch') query.set('id', String(id));
    else if (view === 'csv') query.set('trans_no', String(id));
    else if (view === 'purchase-order' || view === 'discrepancy-po') query.set('trans_no', String(id));
    else query.set('trans_no', String(id));
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001'}/transaction-views/${config.endpoint}?${query}`)
      .then(async (response) => { const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.message ?? 'Could not load this transaction.'); return body; })
      .then((body) => { if (!cancelled) setData(body); }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load this transaction.'); });
    return () => { cancelled = true; };
  }, [config, view, source]);
  const missing = !config ? 'This page has not been converted.' : !source.branch ? 'A branch is required.' : !config.numberKeys.some((key) => source[key]) ? 'A transaction number is required.' : '';
  const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  return <div style={view === 'rs-slip' ? { width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' } : undefined}><main style={{ boxSizing: 'border-box', width: view === 'rs-slip' ? 280 : view === 'rs' ? '100%' : undefined, maxWidth: view === 'rs-slip' ? 280 : view === 'rs' ? 'none' : 1050, margin: view === 'rs-slip' ? 0 : view === 'rs' ? '0 auto' : '24px auto', padding: view === 'rs-slip' || view === 'rs' ? 0 : 24, background: 'white', color: '#222', font: view === 'rs-slip' ? '12px Verdana,Arial,sans-serif' : '14px Arial,sans-serif' }}>
    {error || missing ? <p role="alert">{error || missing}</p> : data === undefined ? <p>Loading transaction…</p> : view === 'rs-slip' ? <RsSlip record={record} /> : view === 'rs' ? <RsView record={record} /> : <><h1 style={{ textAlign: 'center', fontSize: 20 }}>{config?.title ?? 'Transaction View'}</h1><Value value={data}/></>}
  </main></div>;
}
