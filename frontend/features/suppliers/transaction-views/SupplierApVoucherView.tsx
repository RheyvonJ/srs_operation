import type { ApVoucherViewData } from './supplierTransactionTypes';
import {
  formatViewDate,
  formatViewMoney,
  TransactionComments,
  TransactionVoidMessage,
  viewCell,
} from './supplierTransactionView.shared';

const labelStyle = {
  ...viewCell,
  width: '10%',
  color: '#fff',
  background: '#c65300',
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
};

function VoucherField({ label, value }: { label: string; value: string }) {
  return <><th style={labelStyle}>{label}</th><td style={viewCell}>{value}</td></>;
}

function VoucherTotal({ label, amount }: { label: string; amount: number }) {
  const value = amount < 0 ? `(${formatViewMoney(Math.abs(amount))})` : formatViewMoney(amount);
  return <tr><td style={viewCell} colSpan={2} /><td style={{ ...viewCell, textAlign: 'right' }} colSpan={3}>{label}</td><td style={{ ...viewCell, textAlign: 'right' }}>{value}</td></tr>;
}

function discountNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function SupplierApVoucherView({ voucher }: { voucher: ApVoucherViewData }) {
  const totalQuantity = voucher.grnItems.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <main className="cv-page" style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
      {voucher.voided && <TransactionVoidMessage>This invoice has been voided.</TransactionVoidMessage>}
      <h1 style={{ margin: '8px 0 14px', fontSize: 14, textAlign: 'center' }}>AP Voucher</h1>
      <table style={{ width: '95%', margin: '0 auto 14px', borderCollapse: 'collapse', fontSize: 12 }}><tbody>
        <tr>
          <VoucherField label="Supplier" value={voucher.supplierName} />
          <VoucherField label="APV No." value={voucher.reference} />
          <VoucherField label="Supplier's Reference" value={voucher.supplierReference} />
        </tr>
        <tr>
          <VoucherField label="APV Date" value={formatViewDate(voucher.tranDate)} />
          <VoucherField label="Due Date" value={formatViewDate(voucher.dueDate)} />
          <VoucherField label="Delivery Date" value={formatViewDate(voucher.deliveryDate)} />
        </tr>
        {voucher.currency && voucher.currency !== voucher.companyCurrency && <tr><VoucherField label="Currency" value={voucher.currency} /><td colSpan={4} /></tr>}
        <TransactionComments comments={voucher.comments} />
      </tbody></table>

      {voucher.grnItems.length > 0 && <table style={{ width: '95%', margin: '0 auto 10px', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr><th colSpan={7} style={{ ...viewCell, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>Received Items Charged on this Invoice</th></tr>
          <tr>{['Delivery', 'Item', 'Unit', 'Quantity', 'Price', 'Discount/s', 'Amount'].map((label) => <th key={label} style={{ ...viewCell, color: '#fff', background: '#c65300', textAlign: label === 'Quantity' || label === 'Price' || label === 'Amount' ? 'right' : 'left' }}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {voucher.grnItems.map((item, index) => <tr key={`${item.item}-${index}`} style={{ background: index % 2 === 0 ? '#f5f5f5' : '#fff' }}>
            <td style={viewCell}>{item.delivery}</td>
            <td style={viewCell}>{item.item}</td>
            <td style={viewCell}>{item.unit}</td>
            <td style={{ ...viewCell, textAlign: 'right' }}>{item.quantity}</td>
            <td style={{ ...viewCell, textAlign: 'right', fontWeight: 700 }}>{formatViewMoney(item.price)}</td>
            <td style={viewCell}>{item.discount}</td>
            <td style={{ ...viewCell, textAlign: 'right', fontWeight: 700 }}>{formatViewMoney(item.amount)}</td>
          </tr>)}
          <tr>
            <td style={viewCell} colSpan={2} />
            <td style={{ ...viewCell, textAlign: 'right' }}>Total QTY</td>
            <td style={{ ...viewCell, textAlign: 'right' }}>{totalQuantity}</td>
            <td style={viewCell} />
            <td style={{ ...viewCell, textAlign: 'right' }}>Total</td>
            <td style={{ ...viewCell, textAlign: 'right', fontWeight: 700 }}>{formatViewMoney(voucher.grnTotal)}</td>
          </tr>
        </tbody>
      </table>}

      {voucher.glItems.length > 0 && <table style={{ width: '95%', margin: '0 auto 10px', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr>{['Account', 'Name', 'Dimension 1', 'Dimension 2', 'Amount', 'Memo'].map((label) => <th key={label} style={viewCell}>{label}</th>)}</tr></thead>
        <tbody>{voucher.glItems.map((item, index) => <tr key={`${item.account}-${index}`}><td style={viewCell}>{item.account}</td><td style={viewCell}>{item.accountName}</td><td style={viewCell}>{item.dimension1}</td><td style={viewCell}>{item.dimension2}</td><td style={{ ...viewCell, textAlign: 'right' }}>{formatViewMoney(item.amount)}</td><td style={viewCell}>{item.memo}</td></tr>)}</tbody>
      </table>}

      <table style={{ width: '95%', margin: '0 auto', borderCollapse: 'collapse', fontSize: 12 }}><tbody>
        {!voucher.nonTrade && <>
          {voucher.purchaseNonVat > 0 && <VoucherTotal label="Purchase NON-VAT:" amount={voucher.purchaseNonVat} />}
          {voucher.purchaseVat > 0 && <VoucherTotal label="Purchase VAT:" amount={voucher.purchaseVat} />}
          {voucher.taxes.map((tax, index) => <VoucherTotal key={`${tax.name}-${index}`} label={`${tax.name}${tax.rate > 0 ? ` (${discountNumber(tax.rate)}%)` : ''}`} amount={tax.amount} />)}
          <VoucherTotal label="TOTAL INVOICE" amount={voucher.amount} />
          {voucher.discount > 0 && <VoucherTotal label={voucher.discountLabel} amount={voucher.discount} />}
          {voucher.ewt > 0 && <>
            <VoucherTotal label={`less ${voucher.ewtPercent}% EWT :`} amount={-voucher.ewt} />
            {voucher.glTotal !== 0 && <>
              <VoucherTotal label="Items Net :" amount={voucher.amount - voucher.ewt} />
              <VoucherTotal label="GL Total :" amount={voucher.glTotal} />
            </>}
            <VoucherTotal label="NET :" amount={voucher.amount - voucher.ewt + voucher.glTotal} />
          </>}
        </>}
        {voucher.nonTrade && <>
          <VoucherTotal label="Invoice Total:" amount={voucher.glTotal} />
          {voucher.ewtPercent > 0 && <>
            <VoucherTotal label={`less ${voucher.ewtPercent}% EWT:`} amount={-voucher.ewt} />
            <VoucherTotal label="NET:" amount={voucher.glTotal - voucher.ewt} />
          </>}
        </>}
      </tbody></table>
    </main>
  );
}
