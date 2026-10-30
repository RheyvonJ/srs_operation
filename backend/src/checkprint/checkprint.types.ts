export interface CheckVoucherPrintLine {
  id: number;
  transType: number;
  transactionType: string;
  transNo: number;
  reference: string;
  supplierReference: string;
  date: string;
  amount: number;
  displayedAmount: number;
  ewt: number;
  comments: string[];
}

export interface CheckVoucherPrintData {
  branch: number;
  id: number;
  cvNo: string;
  cvDate: string;
  createdAt: string;
  supplierName: string;
  supplierAddress: string;
  companyName: string;
  companyAddress: string;
  amount: number;
  ewt: number;
  invoiceEwt: number;
  ewtToDisplay: number;
  amountInWords: string;
  total: number;
  approved: boolean;
  voided: boolean;
  cvPrinted: boolean;
  checkPrinted: boolean;
  paymentType: 'cheque' | 'online' | 'other';
  bankName: string;
  bankAccountName: string;
  bankDate: string;
  cheques: Array<{ number: string; date: string; amount: number; payTo: string }>;
  comments: string[];
  lines: CheckVoucherPrintLine[];
  glItems: Array<{ account: string; accountName: string; amount: number; memo: string }>;
  preparedBy: string;
  preparedAt: string;
  approvedBy: string;
  approvedAt: string;
}

export const CHECKPRINT_TRANS_TYPES: Record<number, string> = {
  0: 'Journal Entry',
  3: 'Bank Transfer',
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
  20: 'AP Voucher',
  21: 'Supplier Credit Note',
  22: 'Supplier Payment',
  24: 'Cash Withholding',
  25: 'Purchase Order Delivery',
  53: 'Supplier Debit Memo',
  54: 'Supplier Credit Memo',
};

export const CHECKPRINT_SHORT_TYPES: Record<number,string> = {
  0:'Journal',1:'Bank Payment',2:'Bank Deposit',3:'Bank Transfer',4:'Bank Transfer',10:'INV',11:'Credit Note',
  12:'Receipt',13:'Delivery',16:'Location Transfer',17:'Inventory Adjustment',18:'PO',20:'APV',21:'Credit Note',
  22:'Payment',24:'CWO',25:'GRN',53:'DM',54:'CM',
};

export function checkprintRows<T>(result: unknown): T[] {
  return Array.isArray(result) && Array.isArray(result[0]) ? result[0] as T[] : [];
}

export function checkprintMoney(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export function checkprintEnglishWords(input: number): string {
  const names=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  const underThousand=(n:number):string=>{const parts:string[]=[];if(n>=100){parts.push(names[Math.floor(n/100)],'hundred');n%=100;}if(n>=20){parts.push(tens[Math.floor(n/10)]);if(n%10)parts.push(names[n%10]);}else if(n>0)parts.push(names[n]);return parts.join('-');};
  const n=Math.max(0,Math.floor(Math.abs(input)));if(n===0)return'zero';
  const units=['','thousand','million','billion','trillion','quadrillion'];let rest=n,index=0;const parts:string[]=[];
  while(rest>0){const chunk=rest%1000;if(chunk)parts.unshift(`${underThousand(chunk)}${units[index]?` ${units[index]}`:''}`);rest=Math.floor(rest/1000);index++;}
  return parts.join(' ').replace(/-([a-z])/g,(_,c:string)=>` ${c}`);
}
