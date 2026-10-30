'use client';

import { useEffect, useState } from 'react';

interface CheckVoucher {
  branch: number;
  cvNo: string;
  cvDate: string;
  supplierName: string;
  companyName: string;
  companyAddress: string;
  amount: number;
  total: number;
  ewtToDisplay: number;
  voided: boolean;
  bankName: string;
  bankAccountName: string;
  cheques: Array<{ number: string; date: string; amount: number; payTo: string }>;
  comments: string[];
  lines: Array<{
    transactionType: string;
    transNo: number;
    reference: string;
    supplierReference: string;
    date: string;
    displayedAmount: number;
    comments: string[];
  }>;
  glItems: Array<{ account: string; accountName: string; amount: number; memo: string }>;
  preparedBy: string;
  preparedAt: string;
  approvedBy: string;
  approvedAt: string;
}

const money = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const displayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
};
const displayTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function CheckVoucherPrintPage() {
  const [voucher, setVoucher] = useState<CheckVoucher | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    let cancelled = false;
    fetch(`${apiBase}/checkprint/voucher?${params}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null) as (CheckVoucher & { message?: string }) | null;
        if (!response.ok || !body?.cvNo) throw new Error(body?.message ?? 'Could not load the Check Voucher.');
        return body;
      })
      .then((body) => { if (!cancelled) setVoucher(body); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load the Check Voucher.'); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p role="alert" className="m-6 text-red-700">{error}</p>;
  if (!voucher) return <p className="m-6">Loading Check Voucher...</p>;

  const print = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    try {
      await fetch(`${apiBase}/checkprint/voucher/printed`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: voucher.branch, cv_no: voucher.cvNo }),
      });
    } finally { window.print(); }
  };

  return (
    <main className="cv-print-screen">
      <div className="cv-print-actions print:hidden"><button onClick={print}>Print Check Voucher</button></div>
      <article className="cv-paper">
        <header className="cv-print-header">
          <div className="cv-print-page-number">page 1</div>
          <h1>{voucher.companyName}</h1>
          <p>{voucher.companyAddress}</p>
          <h2>CHECK VOUCHER</h2>
          <strong className="cv-print-number">No. {voucher.cvNo}</strong>
        </header>

        <section className="cv-print-payee">
          <b>PAY TO:</b><span>{voucher.supplierName}</span>
          <b className="cv-print-date-label">Date:</b><span>{displayDate(voucher.cvDate)}</span>
        </section>

        <table className="cv-particulars">
          <thead><tr><th>PARTICULARS</th><th>AMOUNT</th></tr></thead>
          <tbody>
            {voucher.lines.map((line, index) => {
              const reference = line.reference || String(line.transNo);
              const extra = [
                line.transactionType === 'AP Voucher' && line.supplierReference ? `SI # ${line.supplierReference}` : line.supplierReference,
                ...line.comments,
              ].filter(Boolean).join(' -- ');
              return (
                <tr key={`${line.transNo}-${index}`}>
                  <td><span className="cv-line-date">{displayDate(line.date)}</span><span>{line.transactionType} # {reference}{extra ? ` -- ${extra}` : ''}</span></td>
                  <td>{money(line.displayedAmount)}</td>
                </tr>
              );
            })}
            {voucher.comments.map((comment, index) => <tr key={`memo-${index}`}><td><span className="cv-line-date"/><span>{comment}</span></td><td /></tr>)}
          </tbody>
          <tfoot><tr><th>Amount Due:</th><th>{money(voucher.total)}</th></tr></tfoot>
        </table>

        <section className="cv-print-settlement">
          <div className="cv-gl">
            <table><thead><tr><th>ACCOUNT TITLE</th><th>DEBIT</th><th>CREDIT</th></tr></thead>
              <tbody>{voucher.glItems.slice(0, 4).map((item, index) => <tr key={`${item.account}-${index}`}>
                <td>{item.accountName || item.account}{item.memo ? ` - ${item.memo}` : ''}</td>
                <td>{item.amount > 0 ? money(item.amount) : ''}</td>
                <td>{item.amount < 0 ? money(Math.abs(item.amount)) : ''}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="cv-received">
            <p>Received Payment By:</p><div className="cv-sign-line"/><p className="cv-center">Collector</p>
            <dl><dt>Bank</dt><dd>{voucher.bankName || voucher.bankAccountName}</dd><dt>Check #</dt><dd>{voucher.cheques.map((check) => check.number).join(', ')}</dd>
              <dt>Date</dt><dd>{voucher.cheques.map((check) => displayDate(check.date)).join(', ')}</dd></dl>
          </div>
        </section>

        <footer className="cv-approval-footer">
          <div><span>Prepared By / Date:</span><b>{voucher.preparedBy}</b><small>{displayTime(voucher.preparedAt)}</small></div>
          <div><span>Certified By / Date:</span><b /><small /></div>
          <div><span>Noted By / Date:</span><b>{voucher.approvedBy}</b><small>{displayTime(voucher.approvedAt)}</small></div>
          <div><span>Approved By / Date:</span><b /><small /></div>
        </footer>
      </article>
      <style jsx global>{`
        .cv-print-screen{min-height:100vh;background:#333;padding:28px 16px 40px;color:#111;font-family:Arial,Helvetica,sans-serif}
        .cv-print-actions{width:min(11in,100%);margin:0 auto 12px;text-align:right}
        .cv-print-actions button{border:0;border-radius:4px;background:#1f2937;color:#fff;padding:9px 16px;cursor:pointer}
        .cv-paper{position:relative;box-sizing:border-box;width:11in;min-height:8.5in;margin:0 auto;background:#fff;padding:.24in .50in .22in;box-shadow:0 2px 14px #0008;font-size:9pt}
        .cv-print-header{position:relative;text-align:center;height:.92in}
        .cv-print-header h1{margin:0;font-size:12pt;font-weight:bold}
        .cv-print-header p{margin:2px 0 12px;font-size:7pt}
        .cv-print-header h2{margin:0;font-family:Georgia,serif;font-size:12pt}
        .cv-print-number{position:absolute;right:.35in;top:.50in;font-family:Georgia,serif;font-size:11pt}
        .cv-print-page-number{position:absolute;right:.05in;top:.13in;font-size:7pt}
        .cv-print-payee{height:.31in;display:grid;grid-template-columns:.65in 1fr .45in 1.1in;align-items:center;gap:4px}
        .cv-print-payee span{border-bottom:1px solid #555;min-height:16px;padding-left:5px}
        .cv-print-date-label{text-align:right}
        .cv-particulars{width:100%;border-collapse:collapse;table-layout:fixed}
        .cv-particulars th,.cv-particulars td{border:1px solid #555;padding:3px 5px;vertical-align:top}
        .cv-particulars thead th{font-family:Georgia,serif;font-size:10pt;height:18px}
        .cv-particulars thead th:first-child{width:60%}
        .cv-particulars thead th:last-child{text-align:center}
        .cv-particulars tbody td{height:17px;font-size:8.5pt}
        .cv-particulars tbody td:last-child{text-align:right;white-space:nowrap}
        .cv-line-date{display:inline-block;width:.70in;white-space:nowrap}
        .cv-particulars tfoot th{height:20px;text-align:right;font-weight:bold}
        .cv-particulars tfoot th:first-child{border-right:0}
        .cv-particulars tfoot th:last-child{text-align:right;border-left:0}
        .cv-print-settlement{display:grid;grid-template-columns:58% 42%;min-height:1.06in}
        .cv-gl table{width:100%;border-collapse:collapse;table-layout:fixed}
        .cv-gl th,.cv-gl td{border:1px solid #555;padding:3px;font-size:7pt;height:16px}
        .cv-gl th{font-family:Georgia,serif}
        .cv-gl th:first-child{width:45%}
        .cv-gl th:not(:first-child),.cv-gl td:not(:first-child){text-align:right}
        .cv-received{border:1px solid #555;padding:4px 7px;font-size:7.5pt}
        .cv-received p{margin:1px 0 4px}
        .cv-received .cv-center{text-align:center}
        .cv-sign-line{height:13px;border-bottom:1px solid #555}
        .cv-received dl{display:grid;grid-template-columns:.42in 1fr;gap:2px;margin:5px 0 0}
        .cv-received dt,.cv-received dd{margin:0;min-height:12px;border-bottom:1px solid #777}
        .cv-approval-footer{position:absolute;left:.50in;right:.50in;bottom:.20in;min-height:.40in;border:1px solid #555;border-radius:8px;display:grid;grid-template-columns:repeat(4,1fr);padding:4px 7px;gap:8px}
        .cv-approval-footer div{display:grid;grid-template-columns:1fr;grid-template-rows:12px 15px 10px;font-size:6.5pt}
        .cv-approval-footer b{font-size:7pt;font-weight:normal;border-bottom:1px solid #777;padding-left:3px}
        .cv-approval-footer small{text-align:center;font-size:6pt}
        @media print{@page{size:letter landscape;margin:0}html,body{margin:0!important;background:#fff!important}.cv-print-screen{min-height:0;padding:0;background:#fff}.cv-paper{width:11in;min-height:8.5in;margin:0;padding:.24in .50in .22in;box-shadow:none;page-break-after:always}.cv-paper:last-child{page-break-after:auto}}
        @media screen and (max-width:700px){.cv-print-screen{padding:8px;overflow:auto}.cv-paper{transform-origin:top left}}
      `}</style>
    </main>
  );
}
