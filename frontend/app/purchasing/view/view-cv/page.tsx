'use client';

import { useEffect, useState } from 'react';
import { apvViewPath } from '../../../../components/bir2307Print';

interface CheckVoucherLine {
  transType: string;
  transactionNumber: string;
  transNo: number | null;
  transTypeId: number;
  date: string;
  supplierInvoice: string;
  amount: number;
}

interface CheckVoucher {
  branch: number | null;
  cvNo: string;
  cvDate: string;
  supplierName: string;
  amount: number;
  ewt: number;
  comments: string[];
  lines: CheckVoucherLine[];
}

function money(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function displayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

export default function ViewCheckVoucherPage() {
  const [voucher, setVoucher] = useState<CheckVoucher | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const branchNumber = Number(params.get('branch'));
    const branch = params.has('branch') && Number.isInteger(branchNumber) && branchNumber >= 0 ? branchNumber : null;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    let cancelled = false;

    fetch(`${apiBaseUrl}/supplier-cv/view?${params.toString()}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as (CheckVoucher & { message?: string }) | null;
        if (!response.ok || !body?.cvNo || !Array.isArray(body.lines)) {
          throw new Error(body?.message || 'Could not load the check voucher. Please check the server connection.');
        }
        return body;
      })
      .then((body) => {
        if (!cancelled) setVoucher({ ...body, branch });
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not load the check voucher. Please check the server connection.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p role="alert" style={{ margin: 24, fontFamily: 'Arial, sans-serif', color: '#D32F2F' }}>{error}</p>;
  }
  if (!voucher) {
    return <p style={{ margin: 24, fontFamily: 'Arial, sans-serif' }}>Loading check voucher...</p>;
  }

  const linesTotal = Math.round((voucher.amount + voucher.ewt) * 100) / 100;

  return (
    <main className="cv-page">
      <h1 style={{ margin: '0 0 16px', fontSize: 20, textAlign: 'center' }}>Check Voucher # {voucher.cvNo}</h1>
      <table className="cv-meta" style={{ width: '100%', margin: '0 auto 16px', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          <tr>
            <Field label="CV No." value={voucher.cvNo} />
            <Field label="CV Date" value={displayDate(voucher.cvDate)} />
          </tr>
          <tr>
            <Field label="Supplier" value={voucher.supplierName} />
            <Field label="Amount" value={money(voucher.amount)} strong />
          </tr>
          {voucher.comments.length > 0 && (
            <tr>
              <th style={labelStyle}>Memo</th>
              <td style={valueStyle} colSpan={3}>{voucher.comments.join('\n')}</td>
            </tr>
          )}
        </tbody>
      </table>
      <h2 style={{ margin: '8px 0', fontSize: 14 }}>Details</h2>
      <div className="cv-lines-wrap">
      <table className="cv-lines" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Transaction Type', 'Trxn #', 'Date', 'Supplier Invoice', 'Amount'].map((heading) => (
              <th key={heading} style={{ border: '1px solid #c8c8c8', background: '#f3f3f3', padding: '6px 8px', textAlign: heading === 'Amount' ? 'right' : 'left' }}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {voucher.lines.map((line, index) => (
            <tr key={`${line.transType}-${line.transactionNumber}-${index}`}>
              <td style={cellStyle}>{line.transType}</td>
              <td style={cellStyle}>
                {line.transNo && voucher.branch !== null ? (
                  <a href={apvViewPath(voucher.branch, line.transNo, line.transTypeId)} target="_blank" rel="noopener noreferrer" style={{ color: '#212121', fontWeight: 700, textDecoration: 'underline' }}>
                    {line.transactionNumber}
                  </a>
                ) : line.transactionNumber}
              </td>
              <td style={cellStyle}>{displayDate(line.date)}</td>
              <td style={cellStyle}>{line.supplierInvoice}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{money(line.amount)}</td>
            </tr>
          ))}
          {voucher.ewt !== 0 && (
            <>
              <Total label="Lines Total:" amount={linesTotal} />
              <Total label="less EWT:" amount={voucher.ewt} />
            </>
          )}
          <Total label="CV TOTAL :" amount={voucher.amount} />
        </tbody>
      </table>
      </div>
    </main>
  );
}

const labelStyle = { border: '1px solid #d7d7d7', background: '#f7f7f7', padding: '6px 8px', textAlign: 'left' as const, width: '18%' };
const valueStyle = { border: '1px solid #d7d7d7', padding: '6px 8px', whiteSpace: 'pre-wrap' as const };
const cellStyle = { border: '1px solid #d7d7d7', padding: '6px 8px' };

function Field({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <th style={labelStyle}>{label}</th>
      <td style={valueStyle}>{strong ? <strong>{value}</strong> : value}</td>
    </>
  );
}

function Total({ label, amount }: { label: string; amount: number }) {
  return (
    <tr>
      <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700 }} colSpan={4}>{label}</td>
      <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700 }}>{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  );
}
