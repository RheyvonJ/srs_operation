import type { ReactNode } from 'react';

export const viewCell = { border: '1px solid #d7d7d7', padding: '6px 8px' };
export const viewHeading = { ...viewCell, background: '#f3f3f3', textAlign: 'left' as const };

export function formatViewMoney(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatViewDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
}

export function TransactionField({ label, value }: { label: string; value: string }) {
  return <><th style={viewHeading}>{label}</th><td style={viewCell}>{value}</td></>;
}

export function TransactionAmount({ label, amount }: { label: string; amount: number }) {
  return <tr><th style={{ ...viewCell, textAlign: 'right' }}>{label}</th><td style={{ ...viewCell, textAlign: 'right', fontWeight: 700 }}>{formatViewMoney(amount)}</td></tr>;
}

export function TransactionComments({ comments }: { comments: string[] }) {
  if (!comments.length) return null;
  return <tr><th style={viewHeading}>Comments</th><td style={{ ...viewCell, whiteSpace: 'pre-wrap' }} colSpan={5}>{comments.join('\n')}</td></tr>;
}

export function TransactionVoidMessage({ children }: { children: ReactNode }) {
  return <p role="status" style={{ color: '#D32F2F', fontWeight: 700 }}>{children}</p>;
}
