'use client';

import { useEffect, useState } from 'react';

interface DateParts {
  month: string;
  day: string;
  year: string;
}

interface BirLine {
  atc: string;
  tax: number;
}

interface Bir2307Form {
  periodFrom: DateParts;
  periodTo: DateParts;
  quarterSlot: 1 | 2 | 3 | null;
  payeeTin: string[];
  payeeName: string;
  payeeAddress: string;
  payeeZip: string;
  payorTin: string[];
  payorName: string;
  payorAddress: string;
  payorZip: string;
  supplierInvoice: string;
  lines: BirLine[];
  income: number;
  tax: number;
  signatory: string;
  signatoryTitle: string;
}

const INCOME_LABEL = [
  'Income Payments Made By Top',
  'Withholding Agents To Their',
  'Local/Resident Supplier Of Goods',
  'Other Than Those Covered By',
  'Other Rates Of Withholding Tax',
];
const QUARTER_X = [76, 102, 127];
const TEMPLATE_PATH = '/assets/bir-2307-template.pdf';
const SIGNATURE_PATH = '/assets/bir-2307-signature.png';

const styles = `
  @page { size: A4 portrait; margin: 0; }
  .bir-page-wrap { box-sizing: border-box; margin: 16px auto; padding-bottom: 32px; font-family: Arial, Helvetica, sans-serif; }
  .bir-sheet { position: relative; box-sizing: border-box; width: 210mm; height: 297mm; margin: 0 auto; overflow: hidden; background: #fff; color: #003277; }
  .bir-template { position: absolute; z-index: 0; top: -5mm; left: 0; width: 210mm; height: 297mm; border: 0; pointer-events: none; }
  .bir-overlay { position: absolute; z-index: 1; inset: 0; color: #003277; font-family: Arial, Helvetica, sans-serif; }
  .bir-value { position: absolute; display: block; line-height: 1; white-space: nowrap; }
  .bir-income-label { position: absolute; left: 15mm; top: 121mm; font-size: 8pt; line-height: 5mm; white-space: nowrap; }
  .bir-invoice { position: absolute; left: 20mm; top: 163mm; font-size: 7pt; white-space: nowrap; }
  .bir-signature { position: absolute; left: 100mm; top: 238mm; width: 25mm; height: auto; }
  .bir-signatory { position: absolute; left: 93mm; top: 248mm; font-size: 8pt; line-height: 3mm; white-space: nowrap; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    .bir-toolbar { display: none !important; }
    .bir-page-wrap { margin: 0; padding: 0; }
    .bir-sheet { width: 210mm; height: 297mm; margin: 0; break-after: avoid; }
  }
`;

function money(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function spaced(value: string): string {
  return value.split('').join(' ');
}

function messageFromBody(body: unknown): string {
  if (!body || typeof body !== 'object' || !('message' in body)) {
    return 'Could not load BIR 2307. Please check the server connection.';
  }
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.join(' ');
  return 'Could not load BIR 2307. Please check the server connection.';
}

function isForm(body: Bir2307Form | null): body is Bir2307Form {
  return Boolean(body && Array.isArray(body.lines) && Array.isArray(body.payeeTin) && typeof body.payeeName === 'string');
}

export default function Bir2307Page() {
  const [form, setForm] = useState<Bir2307Form | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    let cancelled = false;
    document.title = 'BIR Form 2307';

    fetch(`${apiBaseUrl}/supplier-cv/bir2307?${params.toString()}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as Bir2307Form | null;
        if (!response.ok || !isForm(body)) throw new Error(messageFromBody(body));
        return body;
      })
      .then((body) => {
        if (!cancelled) setForm(body);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not load BIR 2307. Please check the server connection.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p role="alert" style={{ margin: 24, fontFamily: 'Arial, sans-serif', color: '#D32F2F' }}>{error}</p>;
  }
  if (!form) {
    return <p style={{ margin: 24, fontFamily: 'Arial, sans-serif' }}>Loading BIR 2307...</p>;
  }

  const rows = form.lines.length > 0 ? form.lines : [{ atc: '', tax: 0 }];
  const field = (left: number, top: number, value: string, size = 10, bold = false) => (
    <span
      className="bir-value"
      style={{ left: `${left}mm`, top: `${top}mm`, fontSize: `${size}pt`, fontWeight: bold ? 700 : 400 }}
    >
      {value}
    </span>
  );

  return (
    <main className="bir-page-wrap">
      <style>{styles}</style>
      <div className="bir-toolbar" style={{ margin: '0 auto 12px', width: '210mm' }}>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ border: 0, borderRadius: 8, background: '#E53935', color: '#fff', fontWeight: 700, padding: '8px 16px', cursor: 'pointer' }}
        >
          Print
        </button>
      </div>

      <section className="bir-sheet" aria-label="BIR Form 2307">
        <iframe
          className="bir-template"
          src={`${TEMPLATE_PATH}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title="Official BIR Form 2307 template"
          aria-hidden="true"
        />
        <div className="bir-overlay">
          {field(54, 31, form.periodFrom.month)}{field(64, 31, form.periodFrom.day)}{field(74, 31, form.periodFrom.year)}
          {field(139, 31, form.periodTo.month)}{field(149, 31, form.periodTo.day)}{field(159, 31, form.periodTo.year)}
          {field(74, 42, form.payeeTin[0] ?? '')}{field(92, 42, form.payeeTin[1] ?? '')}
          {field(110, 42, form.payeeTin[2] ?? '')}{field(130, 42, form.payeeTin[3] ?? '')}
          {field(20, 51, form.payeeName)}{field(20, 61, form.payeeAddress, 7)}{field(185, 61, spaced(form.payeeZip), 12)}
          {field(74, 82, form.payorTin[0] ?? '')}{field(92, 82, form.payorTin[1] ?? '')}
          {field(110, 82, form.payorTin[2] ?? '')}{field(130, 82, form.payorTin[3] ?? '')}
          {field(20, 91, form.payorName)}{field(20, 100, form.payorAddress, 7)}{field(185, 100, spaced(form.payorZip), 12)}

          <div className="bir-income-label">{INCOME_LABEL.map((label) => <div key={label}>{label}</div>)}</div>
          {rows.map((line, index) => {
            const y = 123 + index * 5;
            return (
              <span key={`${line.atc}-${index}`}>
                {field(62, y, line.atc, 7)}
                {index === 0 && form.quarterSlot ? field(QUARTER_X[form.quarterSlot - 1], y, money(form.income), 7) : null}
                {index === 0 ? field(155, y, money(form.income), 7) : null}
                {line.atc || line.tax ? field(179, y, money(line.tax), 7) : null}
              </span>
            );
          })}
          {form.supplierInvoice ? <span className="bir-invoice">{form.supplierInvoice}</span> : null}
          {form.quarterSlot ? field(QUARTER_X[form.quarterSlot - 1], 228, money(form.income), 7, true) : null}
          {field(155, 228, money(form.income), 7, true)}{field(179, 228, money(form.tax), 7, true)}
          <img className="bir-signature" src={SIGNATURE_PATH} alt="" />
          <span className="bir-signatory"><strong>{form.signatory}</strong><br />{form.signatoryTitle}</span>
        </div>
      </section>
    </main>
  );
}
