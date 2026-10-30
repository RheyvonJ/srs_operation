import type { SupplierDebitMemoViewData } from './supplierTransactionTypes';
import {
  formatViewMoney,
  TransactionField,
  TransactionVoidMessage,
  viewCell,
  viewHeading,
} from './supplierTransactionView.shared';

function formatDebitMemoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(match[2]) - 1];
  return month ? `${month} ${match[3]} ${match[1]}` : value;
}

export function SupplierDebitMemoView({ memo }: { memo: SupplierDebitMemoViewData }) {
  return (
    <main className="cv-page" style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
      {memo.voided && <TransactionVoidMessage>This transaction has been voided.</TransactionVoidMessage>}
      <h2 style={{ margin: 0, fontSize: 16, textAlign: 'center' }}>{memo.companyName}</h2>
      <p style={{ margin: 0, textAlign: 'center' }}>{memo.companyAddress}</p>
      <h1 style={{ margin: '0 0 8px', fontSize: 20, textAlign: 'center' }}>General Ledger Transaction Details</h1>
      <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}><tbody>
        <tr><TransactionField label="Supplier" value={memo.supplierName} /><TransactionField label="General Ledger Transaction Details" value={memo.transactionType} /><TransactionField label="Reference" value={memo.reference} /><TransactionField label="Date" value={formatDebitMemoDate(memo.tranDate)} /><TransactionField label="Supplier Reference" value={memo.supplierReference} /></tr>
      </tbody></table>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Account Code', 'Account Name', ...(memo.dimensionCount >= 1 ? ['Dimension 1'] : []), ...(memo.dimensionCount >= 2 ? ['Dimension 2'] : []), 'Debit', 'Credit', 'Memo'].map((label) => <th key={label} style={viewHeading}>{label}</th>)}</tr></thead>
          <tbody>
            {memo.glItems.map((item, index) => <tr key={`${item.account}-${index}`}><td style={viewCell}>{item.account}</td><td style={viewCell}>{item.accountName}</td>{memo.dimensionCount >= 1 && <td style={viewCell}>{item.dimension1}</td>}{memo.dimensionCount >= 2 && <td style={viewCell}>{item.dimension2}</td>}<td style={{ ...viewCell, textAlign: 'right' }}>{item.debit ? formatViewMoney(item.debit) : ''}</td><td style={{ ...viewCell, textAlign: 'right' }}>{item.credit ? formatViewMoney(item.credit) : ''}</td><td style={viewCell}>{item.memo}</td></tr>)}
            {memo.glItems.length === 0 && <tr><td style={viewCell} colSpan={5 + memo.dimensionCount}>No general ledger transactions have been created for this transaction.</td></tr>}
          </tbody>
        </table>
      </div>
      {(memo.preparedBy || memo.approvedBy.length > 0) && <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}><tbody>
        {memo.preparedBy && <tr><TransactionField label="Prepared by" value={memo.preparedBy} />{memo.approvedBy.length === 0 && <><td /><td /></>}</tr>}
        {memo.approvedBy.map((name, index) => <tr key={`${name}-${index}`}><TransactionField label="Approved by" value={name} /></tr>)}
      </tbody></table>}
    </main>
  );
}
