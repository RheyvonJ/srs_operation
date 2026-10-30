export interface SupplierTransactionBase {
  viewKind: 'invoice' | 'payment' | 'general-ledger';
  transNo: number;
  transactionType: string;
  reference: string;
  supplierName: string;
  tranDate: string;
  voided: boolean;
}

export interface ApVoucherViewData extends SupplierTransactionBase {
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

export interface SupplierPaymentViewData extends SupplierTransactionBase {
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

export interface SupplierDebitMemoViewData extends SupplierTransactionBase {
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

export type SupplierTransactionViewData = ApVoucherViewData | SupplierPaymentViewData | SupplierDebitMemoViewData;
