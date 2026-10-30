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
  return <main style={{ maxWidth: view === 'rs-slip' ? 360 : 1050, margin: '24px auto', padding: 24, background: 'white', color: '#222', font: '14px Arial,sans-serif' }}>
    {error || missing ? <p role="alert">{error || missing}</p> : data === undefined ? <p>Loading transaction…</p> : view === 'rs-slip' ? <><header style={{ textAlign: 'center', fontWeight: 700 }}>{String(record.companyName ?? '')}<br/>Return to Supplier Slip<br/>RS #: {String(record.movementNo ?? '')}</header><p>Supplier: {String(record.supplierName ?? '')}<br/>Date: {String(record.date ?? '')}<br/>SA to BO #: {String(record.rsId ?? '')}<br/>Remarks: {String(record.remarks ?? '')}</p><Value value={record.items}/><p style={{ textAlign: 'right' }}>TOTAL: {String(record.total ?? '')}</p><style>{'@media print { body { margin: 0; } main { margin: 0 auto !important; padding: 8px !important; } }'}</style></> : <><h1 style={{ textAlign: 'center', fontSize: 20 }}>{config?.title ?? 'Transaction View'}</h1><Value value={data}/></>}
  </main>;
}
