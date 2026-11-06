import React from 'react';

export const inquiryInputClassName =
  'h-10 w-full min-w-0 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20';

export const inquiryThClassName =
  'px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#616161]';

export const inquiryTdClassName =
  'border-b border-[#EEEEEE] px-2 py-2.5 align-middle text-sm leading-5 text-[#212121] break-words';

export function formatInquiryDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatInquiryAmount(amount: number, digits = 2): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function downloadCsv(filename: string, headers: string[], records: string[][]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = [headers, ...records].map((row) => row.map((cell) => escape(cell)).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const InquiryField: React.FC<{
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, htmlFor, children, className }) => (
  <div className={`grid min-w-0 gap-1.5 ${className ?? ''}`}>
    <label htmlFor={htmlFor} className="text-[11px] font-semibold text-[#616161]">
      {label}
    </label>
    {children}
  </div>
);

export const inquiryStageClassName = 'flex flex-col gap-3 xl:min-h-0 xl:flex-1';

export const inquiryPlaceholderClassName =
  'flex min-h-40 flex-1 items-start justify-center rounded-xl border border-[#E0E0E0] bg-white px-6 pt-8 text-center text-sm text-[#757575] shadow-sm';

export const InquiryFilters: React.FC<{
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}> = ({ children, onSubmit, className }) => (
  <form
    onSubmit={onSubmit}
    className={`@container shrink-0 rounded-xl border border-[#E0E0E0] bg-white shadow-sm ${className ?? 'p-3 sm:p-4'}`}
  >
    {children}
  </form>
);

export const DisplayButton: React.FC<{
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ children, disabled }) => (
  <button
    type="submit"
    disabled={disabled}
    className="inline-flex min-h-10 w-full items-center justify-center whitespace-normal rounded-lg bg-[#E53935] px-4 py-2 text-center text-[11px] font-heading font-extrabold uppercase leading-tight tracking-wider text-white shadow-sm transition-colors hover:bg-[#C62828] focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-75 @lg:w-auto"
  >
    {children}
  </button>
);

export const ResultsPanel: React.FC<{
  count: number;
  range?: string;
  lead?: React.ReactNode;
  onExport?: () => void;
  children: React.ReactNode;
}> = ({ count, range, lead, onExport, children }) => (
  <div className="flex min-h-48 flex-1 flex-col overflow-hidden rounded-xl border border-[#E0E0E0] bg-white shadow-sm lg:min-h-0">
    <div className="flex shrink-0 flex-col gap-2 border-b border-[#EEEEEE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-[#212121]">
        {lead ?? (
          <>
            {count.toLocaleString('en-US')} {count === 1 ? 'result' : 'results'}
            {range ? <span className="font-medium text-[#757575]"> · {range}</span> : null}
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onExport}
        disabled={!onExport || count === 0}
        className="self-start rounded-lg border border-[#E0E0E0] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#424242] transition-colors hover:border-[#212121] disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
      >
        Export CSV
      </button>
    </div>
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
  </div>
);

export const classicCellClassName = 'border border-[#D0D0D0] px-2 py-1.5';

export function classicHeadClassName(alignRight = false): string {
  return `border border-white/15 px-2 py-2 text-[13px] font-semibold ${alignRight ? 'text-right' : 'text-left'}`;
}

export function classicRowClassName(index: number): string {
  return index % 2 === 0 ? 'bg-white' : 'bg-[#F3F3F3]';
}

export const classicLinkClassName = 'font-bold text-[#212121] underline';

export const ClassicList: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <div className="flex min-h-40 flex-col xl:min-h-0 xl:flex-1">
    <div className="flex shrink-0 flex-col items-center gap-2 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
      <span className="hidden sm:block" />
      <h3 className="text-balance text-center text-sm font-bold text-[#212121]">{title}</h3>
      {action ? <div className="sm:justify-self-end">{action}</div> : <span className="hidden sm:block" />}
    </div>
    <div className="@container min-w-0 xl:min-h-0 xl:flex-1 xl:overflow-x-hidden xl:overflow-y-auto">{children}</div>
  </div>
);

export const ListExportButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
}> = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#424242] transition-colors hover:border-[#212121] disabled:cursor-not-allowed disabled:opacity-40"
  >
    Export CSV
  </button>
);

export const InquiryNote: React.FC<{
  tone: 'error' | 'empty' | 'pending';
  children: React.ReactNode;
}> = ({ tone, children }) => (
  <p
    role={tone === 'error' ? 'alert' : 'status'}
    className={
      tone === 'error'
        ? 'rounded-xl border border-[#E53935]/25 bg-[#FFEBEE] px-4 py-3 text-sm font-medium text-[#C62828]'
        : 'rounded-xl border border-[#E0E0E0] bg-white px-4 py-8 text-center text-sm text-[#616161] shadow-sm'
    }
  >
    {children}
  </p>
);
