import type { SupplierPaymentViewData } from './supplierTransactionTypes';
import {
  formatViewDate,
  formatViewMoney,
  TransactionComments,
  TransactionField,
  TransactionVoidMessage,
  viewCell,
  viewHeading,
} from './supplierTransactionView.shared';

export function SupplierPaymentView({ payment }: { payment: SupplierPaymentViewData }) {
  return (
    <main className="cv-page" style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
      {payment.voided && <TransactionVoidMessage>This payment has been voided.</TransactionVoidMessage>}
      <h1 style={{ margin: '0 0 16px', fontSize: 20, textAlign: 'center' }}>Payment to Supplier</h1>
      <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}><tbody>
        <tr><TransactionField label="To Supplier" value={payment.supplierName} /><TransactionField label="From Bank Account" value={payment.bankAccountName} /><TransactionField label="Date Paid" value={formatViewDate(payment.tranDate)} /></tr>
        <tr>{(payment.bankCurrency !== payment.companyCurrency || payment.supplierCurrency !== payment.companyCurrency) && <TransactionField label="Payment Currency" value={payment.bankCurrency} />}<TransactionField label="Amount" value={formatViewMoney(payment.amount)} /><TransactionField label="EWT" value={formatViewMoney(payment.ewt)} /><TransactionField label="Payment Type" value={payment.paymentType} /></tr>
        <tr>{(payment.bankCurrency !== payment.companyCurrency || payment.supplierCurrency !== payment.companyCurrency) && <TransactionField label="Supplier's Currency" value={payment.supplierCurrency} />}{payment.bankCurrency !== payment.supplierCurrency && <TransactionField label="Amount" value={formatViewMoney(payment.supplierAmount)} />}<TransactionField label="Reference" value={payment.reference} /></tr>
        <TransactionComments comments={payment.comments} />
      </tbody></table>

      {payment.paymentType === 'Cheque' && <>
        <h2 style={{ fontSize: 15 }}>Cheque Details</h2>
        <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
          <thead><tr>{['Supplier', 'Bank', 'Cheque Number', 'Cheque Date', 'Amount'].map((label) => <th key={label} style={viewHeading}>{label}</th>)}</tr></thead>
          <tbody>
            {payment.chequeDetails.map((cheque, index) => <tr key={`${cheque.number}-${index}`}><td style={viewCell}>{cheque.payTo}</td><td style={viewCell}>{cheque.bank}</td><td style={viewCell}>{cheque.number}</td><td style={viewCell}>{formatViewDate(cheque.date)}</td><td style={{ ...viewCell, textAlign: 'right' }}>{formatViewMoney(cheque.amount)}</td></tr>)}
          </tbody>
        </table>
      </>}

      {!payment.voided && <>
        <h2 style={{ fontSize: 15 }}>Payment Allocations</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Transaction Type', 'Transaction #', 'Reference', 'Date', 'Amount'].map((label) => <th key={label} style={viewHeading}>{label}</th>)}</tr></thead>
          <tbody>
            {payment.allocations.map((allocation, index) => <tr key={`${allocation.transactionType}-${allocation.transactionNumber}-${index}`}><td style={viewCell}>{allocation.transactionType}</td><td style={viewCell}>{allocation.transactionNumber}</td><td style={viewCell}>{allocation.reference}</td><td style={viewCell}>{formatViewDate(allocation.date)}</td><td style={{ ...viewCell, textAlign: 'right' }}>{formatViewMoney(allocation.amount)}</td></tr>)}
            {payment.allocations.length === 0 && <tr><td style={viewCell} colSpan={5}>No allocations.</td></tr>}
          </tbody>
        </table>
      </>}
    </main>
  );
}
