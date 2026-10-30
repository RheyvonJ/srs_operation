export const SUPPLIER_INVOICE = 20;
export const SUPPLIER_PAYMENT = 22;
export const SUPPLIER_DEBIT_MEMO = 53;
export const SUPPLIER_TRANSACTION_TYPES = [SUPPLIER_INVOICE, SUPPLIER_PAYMENT, SUPPLIER_DEBIT_MEMO];

export const TRANS_TYPE_NAMES: Record<number, string> = {
  0: 'Journal Entry',
  1: 'Bank Payment',
  2: 'Bank Deposit',
  4: 'Funds Transfer',
  10: 'Sales Invoice',
  11: 'Customer Credit Note',
  12: 'Customer Payment',
  13: 'Delivery',
  16: 'Location Transfer',
  17: 'Inventory Adjustment',
  18: 'Purchase Order',
  20: 'Supplier Invoice',
  21: 'Supplier Credit Note',
  22: 'Supplier Payment',
  24: 'Cash Withholding',
  25: 'Purchase Order Delivery',
  53: 'Supplier Debit Memo',
  54: 'Supplier Credit Memo',
};

interface SupplierTransactionBase {
  transNo: number;
  transactionType: string;
  reference: string;
  supplierName: string;
  tranDate: string;
  voided: boolean;
}

export interface SupplierInvoiceView extends SupplierTransactionBase {
  viewKind: 'invoice';
  supplierReference: string;
  dueDate: string;
  deliveryDate: string;
  currency: string;
  companyCurrency: string;
  nonTrade: boolean;
  comments: string[];
  glItems: { account: string; accountName: string; dimension1: string; dimension2: string; amount: number; memo: string }[];
  glItemsTotal: number;
  grnItems: { delivery: string; item: string; unit: string; description: string; quantity: number; price: number; discount: string; amount: number }[];
  grnTotal: number;
  purchaseNonVat: number;
  purchaseVat: number;
  taxes: { name: string; rate: number; amount: number }[];
  amount: number;
  glTotal: number;
  discount: number;
  discountLabel: string;
  ewt: number;
  ewtPercent: number;
}

export interface SupplierPaymentView extends SupplierTransactionBase {
  viewKind: 'payment';
  supplierReference: string;
  bankAccountName: string;
  bankCurrency: string;
  supplierCurrency: string;
  companyCurrency: string;
  paymentType: string;
  amount: number;
  supplierAmount: number;
  ewt: number;
  comments: string[];
  chequeDetails: { payTo: string; bank: string; branch: string; number: string; date: string; amount: number }[];
  allocations: { transactionType: string; transactionNumber: number; reference: string; amount: number; date: string }[];
}

export interface SupplierDebitMemoView extends SupplierTransactionBase {
  viewKind: 'general-ledger';
  companyName: string;
  companyAddress: string;
  dimensionCount: number;
  supplierReference: string;
  glItems: {
    account: string;
    accountName: string;
    dimension1: string;
    dimension2: string;
    debit: number;
    credit: number;
    memo: string;
  }[];
  preparedBy: string;
  approvedBy: string[];
}

export type SupplierTransaction = SupplierInvoiceView | SupplierPaymentView | SupplierDebitMemoView;

export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return [];
}

export function signedMoney(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}
