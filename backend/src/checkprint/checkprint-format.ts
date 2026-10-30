import { CHECKPRINT_SHORT_TYPES } from './checkprint.types.js';

export interface CheckExportVoucherLine {
  cvNo:string; transType:string; reference:string; supplierReference:string; date:string;
  amount:number; amountPaid:number;
}
export interface CheckExportVoucher {
  personId:number|string; payTo:string; checkNumber:string; checkDate:string; checkAmount:number;
  cvNo:string; invoiceLines:CheckExportVoucherLine[]; ewt:number; cvDate:string;
}

const pad=(value:string,length:number)=>value.length>=length?value.slice(0,length):value.padEnd(length,' ');
const fixedAmount=(value:number,length:number)=>`${Math.floor(Math.abs(value))}${String(Math.round((Math.abs(value)%1)*100)).padStart(2,'0')}`.padStart(length,'0');
const zero=(_value:number,length:number)=>'0'.padStart(length,'0');
const dmy=(input:string)=>{const date=new Date(input);return Number.isNaN(date.getTime())?'':`${String(date.getDate()).padStart(2,'0')}${String(date.getMonth()+1).padStart(2,'0')}${date.getFullYear()}`;};

export function cvExportRows(v:CheckExportVoucher,format:'aub'|'metrobank'):string[] {
  const payTo=v.payTo||'';const amount=v.checkAmount;
  const check=`C${String(v.personId).padEnd(10)}${''.padEnd(50)}${fixedAmount(amount,15)}${dmy(v.checkDate)}${'X1'.padEnd(format==='aub'?8:2)}${''.padEnd(format==='aub'?50:0)}${payTo.padEnd(format==='aub'?250:0)}`;
  const rows=[check];let remaining=amount;
  for(const line of v.invoiceLines){const paid=line.amount>0?remaining:0;if(line.amount>0)remaining=Math.round((remaining-line.amount)*100)/100;
    const ref=`${CHECKPRINT_SHORT_TYPES[Number(line.transType.replace(/^T/,''))]??line.transType}#${line.reference}`;const inv=line.transType==='APV'&&line.supplierReference?`SI#${line.supplierReference}`:'';
    rows.push(`V${pad(ref,16)}${pad(v.cvNo,15)}${pad(inv,15)}${dmy(line.date)}${fixedAmount(line.amount,21)}${zero(0,21)}${zero(0,21)}${fixedAmount(paid,21)}`);
  }
  if(format==='metrobank'&&v.ewt!==0)rows.push(`V${pad('EWT',16)}${pad(v.cvNo,15)}${pad('',15)}${dmy(v.cvDate)}${fixedAmount(v.ewt,21)}${zero(0,21)}${zero(0,21)}${zero(0,21)}`);
  return rows;
}

export function mbCcws(rows:string[],date:string,batchNo:number):string {
  const batch=String(batchNo).padStart(2,'0').slice(-2);
  return [`MBTC-CCWS${dmy(date)}-${batch}`,...rows].join('\r\n')+'\r\n';
}

