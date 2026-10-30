import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';
import { checkprintRows, checkprintMoney, checkprintEnglishWords, CHECKPRINT_SHORT_TYPES, type CheckVoucherPrintData } from './checkprint.types.js';
import { cvExportRows, mbCcws, type CheckExportVoucher } from './checkprint-format.js';

const IDENTIFIER = /^[A-Za-z0-9_]+$/;

@Injectable()
export class CheckprintService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async voucher(query: unknown): Promise<CheckVoucherPrintData> {
    const input = this.input(query);
    const schema = await this.schema(input.branch);
    const cv = checkprintRows<any>(await this.db.raw(
      `SELECT h.*, s.supp_name AS supplierName, s.address AS supplierAddress,
              b.coy_name AS companyName, b.postal_address AS companyAddress
       FROM \`${schema}\`.\`0_cv_header\` h
       LEFT JOIN \`${schema}\`.\`0_suppliers\` s ON h.person_type = 3 AND s.supplier_id = CAST(h.person_id AS UNSIGNED)
       CROSS JOIN \`${schema}\`.\`0_company\` b
       WHERE h.cv_no = ? LIMIT 1`, [input.cvNo],
    ))[0];
    if (!cv) throw new NotFoundException('Check Voucher was not found.');
    const id = Number(cv.id);
    const [details, notes, audits, bank, checks, glItems, debitMemos, company, voidRows] = await Promise.all([
      this.db.raw(`SELECT d.id, d.trans_type AS transType, d.trans_no AS transNo, d.amount, d.voided,
          DATE_FORMAT(CASE WHEN d.trans_type=20 THEN st.del_date ELSE st.tran_date END,'%Y-%m-%d') AS tranDate,
          st.reference, st.supp_reference AS suppReference, st.ewt,
          GROUP_CONCAT(DISTINCT c.memo_ ORDER BY c.date_ SEPARATOR '\\n') AS memo
        FROM \`${schema}\`.\`0_cv_details\` d
        LEFT JOIN \`${schema}\`.\`0_supp_trans\` st ON st.type=d.trans_type AND st.trans_no=d.trans_no
        LEFT JOIN \`${schema}\`.\`0_comments\` c ON c.type=d.trans_type AND c.id=d.trans_no
        WHERE d.cv_id=? AND d.trans_type<>22 GROUP BY d.id ORDER BY d.amount DESC`, [id]),
      this.db.raw(`SELECT memo_ AS memo FROM \`${schema}\`.\`0_comments\` WHERE type=99 AND id=? ORDER BY date_`, [id]),
      this.db.raw(`SELECT a.description,a.user,DATE_FORMAT(a.stamp,'%Y-%m-%d %H:%i:%s') AS stamp,u.real_name AS userName
        FROM \`${schema}\`.\`0_audit_trail\` a LEFT JOIN \`${schema}\`.\`0_users\` u ON u.id=a.user
        WHERE a.type=99 AND a.trans_no=? AND a.description IN ('CV created','CV approved') ORDER BY a.stamp`, [id]),
      this.db.raw(`SELECT ba.bank_name AS bankName, ba.bank_account_name AS bankAccountName, ba.bank_curr_code AS currency
        FROM \`${schema}\`.\`0_bank_trans\` bt LEFT JOIN \`${schema}\`.\`0_bank_accounts\` ba ON ba.account_code=bt.bank_act
        WHERE bt.id=? LIMIT 1`, [cv.bank_trans_id]),
      this.db.raw(`SELECT cd.chk_number AS number, DATE_FORMAT(cd.chk_date,'%Y-%m-%d') AS date, cd.chk_amount AS amount,
          cd.pay_to AS payTo, ba.bank_name AS bankName
        FROM \`${schema}\`.\`0_cheque_details\` cd JOIN \`${schema}\`.\`0_bank_trans\` bt ON bt.id=cd.bank_trans_id
        LEFT JOIN \`${schema}\`.\`0_bank_accounts\` ba ON ba.id=bt.bank_act
        WHERE bt.id=? AND cd.type=bt.type ORDER BY cd.id`, [cv.bank_trans_id ? Number(cv.bank_trans_id) : -1]),
      this.db.raw(`SELECT DISTINCT gl.account, coa.account_name AS accountName, gl.amount, gl.memo_
        FROM \`${schema}\`.\`0_gl_trans\` gl LEFT JOIN \`${schema}\`.\`0_chart_master\` coa ON coa.account_code=gl.account
        LEFT JOIN \`${schema}\`.\`0_cv_details\` d ON d.trans_type=gl.type AND d.trans_no=gl.type_no AND d.cv_id=?
        LEFT JOIN \`${schema}\`.\`0_company\` co ON 1=1
        WHERE ((gl.type=99 AND gl.type_no=?) OR d.cv_id=?)
          AND gl.account<>co.creditors_act AND gl.account<>co.creditors_act_nt ORDER BY gl.counter`, [id,id,id]),
      this.db.raw(`SELECT st.trans_no AS transNo,st.reference,st.ov_amount,st.ov_gst,st.ewt,st.tran_date,
          GROUP_CONCAT(DISTINCT c.memo_ ORDER BY c.date_ SEPARATOR '\\n') AS memo
        FROM \`${schema}\`.\`0_supp_trans\` st LEFT JOIN \`${schema}\`.\`0_comments\` c ON c.type=53 AND c.id=st.trans_no
        WHERE st.type=53 AND st.cv_id=? GROUP BY st.trans_no`, [id]),
      this.db.raw(`SELECT coy_name AS companyName,postal_address AS companyAddress,creditors_act AS creditorsAct,creditors_act_nt AS creditorsActNt FROM \`${schema}\`.\`0_company\` LIMIT 1`),
      this.db.raw(`SELECT COUNT(*) AS count FROM \`${schema}\`.\`0_voided\` WHERE type=? AND id=?`,[99,id]),
    ]);
    const lineRows = checkprintRows<any>(details);
    const dmRows = checkprintRows<any>(debitMemos);
    const lineData = [...lineRows, ...dmRows.map((x:any) => ({...x, transType:53, amount:checkprintMoney(x.ov_amount), ewt:x.ewt, voided:0}))];
    const lineAmounts = lineData.map((x:any) => checkprintMoney(x.amount));
    const invoiceEwt = lineData.reduce((sum:number,x:any) => sum + (Number(x.transType)===20 ? checkprintMoney(x.ewt) : 0), 0);
    const audit = checkprintRows<any>(audits);
    const prepared = audit.find((x:any)=>x.description==='CV created');
    const approved = audit.find((x:any)=>x.description==='CV approved');
    const bankRow = checkprintRows<any>(bank)[0] ?? {};
    const companyRow = checkprintRows<any>(company)[0] ?? {};
    const voided = Number(checkprintRows<any>(voidRows)[0]?.count ?? 0) > 0;
    const headerAmount = checkprintMoney(cv.amount);
    return {
      branch: input.branch, id, cvNo: String(cv.cv_no), cvDate: this.date(cv.cv_date), createdAt: this.dateTime(cv.creation_date),
      supplierName: String(cv.supplierName ?? ''), supplierAddress: String(cv.supplierAddress ?? ''),
      companyName: String(companyRow.companyName ?? cv.companyName ?? ''), companyAddress: String(companyRow.companyAddress ?? cv.companyAddress ?? ''),
      amount: headerAmount, amountInWords: checkprintEnglishWords(Number(checkprintMoney(cv.amount))), ewt: checkprintMoney(cv.ewt), invoiceEwt,
      ewtToDisplay: checkprintMoney(cv.ewt) || (this.date(cv.cv_date) < '2013-08-01' ? invoiceEwt : 0),
      total: voided ? lineAmounts.reduce((a:number,b:number)=>a+b,0) : headerAmount,
      approved: Number(cv.approved)===1, voided, cvPrinted:Number(cv.cv_printed)===1, checkPrinted:Number(cv.check_printed)===1,
      paymentType: Number(cv.online_payment)===2 || Number(cv.online_check_payment)===2 || Number(cv.online_aca_payment)===2 ? 'online' : cv.bank_trans_id ? 'cheque' : 'other',
      bankName:String(bankRow.bankName??''), bankAccountName:String(bankRow.bankAccountName??''), bankDate:this.date(cv.cv_date),
      cheques:checkprintRows<any>(checks).map((x:any)=>({number:String(x.number??''),date:this.date(x.date),amount:checkprintMoney(x.amount),payTo:String(x.payTo??'')})),
      comments:checkprintRows<any>(notes).map((x:any)=>String(x.memo??'').trim()).filter(Boolean),
      lines:lineData.map((x:any,index:number)=>({id:Number(x.id??index),transType:Number(x.transType),transactionType:Number(x.transType)===53?'Supplier Debit Memo':Number(x.transType)===20?'AP Voucher':`Type ${x.transType}`,transNo:Number(x.transNo)||0,reference:String(x.reference??''),supplierReference:String(x.suppReference??''),date:this.date(x.tranDate),amount:checkprintMoney(x.amount),displayedAmount:checkprintMoney(x.amount)+(Number(x.transType)===20?checkprintMoney(x.ewt):0),ewt:checkprintMoney(x.ewt),comments:String(x.memo??'').split('\n').filter(Boolean),voided:Number(x.voided)===1})),
      glItems:checkprintRows<any>(glItems).map((x:any)=>({account:String(x.account??''),accountName:String(x.accountName??''),amount:checkprintMoney(x.amount),memo:String(x.memo_??'')})),
      preparedBy:String(prepared?.userName??''),preparedAt:String(prepared?.stamp??''),approvedBy:String(approved?.userName??''),approvedAt:String(approved?.stamp??''),
    };
  }

  async list(query: unknown): Promise<{rows:unknown[];total:number}> {
    const source=query&&typeof query==='object'?query as Record<string,unknown>:{};
    const {branch}=this.inputBranch(source); const schema=await this.schema(branch);
    const from=String(source.from??'').trim(), to=String(source.to??'').trim();
    const status=Number(source.status??0), supplier=Number(source.supplier_id??0);
    const cvNo=String(source.cv_no??'').trim(), useDue=source.use_duedate===true||source.use_duedate==='1';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new BadRequestException('Valid from and to dates are required.');
    const dateColumn=useDue?'due_date':'cv_date';
    const where:string[]=[];const bindings:(string|number)[]=[];
    if(cvNo){where.push('h.cv_no LIKE ?');bindings.push(`%${cvNo}%`);}else{where.push(`h.${dateColumn} BETWEEN ? AND ?`);bindings.push(from,to);}
    switch(status){case 1:where.push('h.bank_trans_id=0 AND h.approved=0 AND h.amount>0');break;
      case 2:where.push(`h.bank_trans_id=0 AND h.approved=1 AND h.online_payment=0 AND h.amount>0 AND h.person_id NOT IN (SELECT supplier_id FROM \`${schema}\`.\`0_suppliers\` WHERE billing_institution_code<>'')`);break;
      case 3:where.push(`h.amount>0 AND h.bank_trans_id=0 AND h.approved=1 AND h.person_id IN (SELECT supplier_id FROM \`${schema}\`.\`0_suppliers\` WHERE billing_institution_code<>'')`);break;
      case 4:where.push('h.bank_trans_id<>0 AND h.approved=1 AND h.online_payment=0');break;
      case 5:where.push('h.bank_trans_id<>0 AND h.approved=1 AND h.online_payment=2');break;}
    if(supplier>0){where.push('h.person_id=?');bindings.push(supplier);}
    const result=await this.db.raw(`SELECT h.id,h.cv_no AS cvNo,DATE_FORMAT(h.cv_date,'%Y-%m-%d') AS cvDate,
      DATE_FORMAT(h.due_date,'%Y-%m-%d') AS dueDate,h.amount,h.ewt,h.approved,h.bank_trans_id AS bankTransId,
      s.supp_name AS supplierName,s.supplier_id AS supplierId
      FROM \`${schema}\`.\`0_cv_header\` h LEFT JOIN \`${schema}\`.\`0_suppliers\` s ON s.supplier_id=CAST(h.person_id AS UNSIGNED)
      WHERE ${where.join(' AND ')} ORDER BY h.cv_date,h.cv_no`,bindings);
    const rows=checkprintRows(result);return{rows,total:rows.length};
  }

  async setNextCheckReference(body: unknown): Promise<{ok:true;nextReference:string}> {
    const x=body&&typeof body==='object'?body as Record<string,unknown>:{};const branch=Number(x.branch),accountId=Number(x.account_id),next=String(x.next_reference??'').trim();
    if(!Number.isInteger(branch)||branch<0||!Number.isInteger(accountId)||accountId<=0||!next)throw new BadRequestException('Branch, checking account, and next check number are required.');
    const schema=await this.schema(branch);const result=await this.db.raw(`UPDATE \`${schema}\`.\`0_check_account\` SET next_reference=? WHERE account_id=?`,[next,accountId]);
    if((result as any)?.[0]?.affectedRows===0)throw new NotFoundException('Checking account was not found.');return{ok:true,nextReference:next};
  }

  async exportChecks(query: unknown): Promise<{filename:string;contentType:string;content:string}> {
    const source=query&&typeof query==='object'?query as Record<string,unknown>:{};const branch=Number(source.branch),format=source.format==='aub'?'aub':'metrobank';
    const ids=String(source.bank_trans_ids??'').split(',').map(Number).filter(n=>Number.isInteger(n)&&n>0);
    if(!Number.isInteger(branch)||branch<0||ids.length===0)throw new BadRequestException('Branch and at least one bank transaction ID are required.');
    const schema=await this.schema(branch);const idsSql=ids.map(()=>'?').join(',');
    const checks=checkprintRows<any>(await this.db.raw(`SELECT bt.id AS bankTransId,bt.person_id AS personId,cd.chk_number AS checkNumber,
      cd.chk_date AS checkDate,cd.chk_amount AS checkAmount,cd.pay_to AS payTo,h.id AS cvId,h.cv_no AS cvNo,h.ewt,h.cv_date AS cvDate
      FROM \`${schema}\`.\`0_bank_trans\` bt JOIN \`${schema}\`.\`0_cheque_details\` cd ON cd.bank_trans_id=bt.id
      JOIN \`${schema}\`.\`0_cv_header\` h ON h.bank_trans_id=bt.id WHERE bt.id IN (${idsSql}) ORDER BY cd.chk_number`,ids));
    if(checks.length===0)throw new NotFoundException('No issued checks were found for the selected transactions.');
    const lines:string[]=[];
    for(const check of checks){const details=checkprintRows<any>(await this.db.raw(`SELECT d.trans_type AS transType,d.trans_no AS transNo,d.amount,st.reference,st.supp_reference AS suppReference,
      CASE WHEN d.trans_type=20 THEN DATE_FORMAT(st.del_date,'%Y-%m-%d') ELSE DATE_FORMAT(st.tran_date,'%Y-%m-%d') END AS tranDate
      FROM \`${schema}\`.\`0_cv_details\` d LEFT JOIN \`${schema}\`.\`0_supp_trans\` st ON st.type=d.trans_type AND st.trans_no=d.trans_no
      WHERE d.cv_id=? AND d.trans_type<>22 AND d.voided=0 ORDER BY d.amount DESC`,[check.cvId]));
      const voucher:CheckExportVoucher={personId:check.personId,payTo:String(check.payTo??''),checkNumber:String(check.checkNumber??''),checkDate:this.date(check.checkDate),checkAmount:checkprintMoney(check.checkAmount),cvNo:String(check.cvNo),cvDate:this.date(check.cvDate),ewt:checkprintMoney(check.ewt),
        invoiceLines:details.map((d:any)=>({cvNo:String(check.cvNo),transType:CHECKPRINT_SHORT_TYPES[Number(d.transType)]??`T${d.transType}`,reference:String(d.reference??d.transNo),supplierReference:String(d.suppReference??''),date:this.date(d.tranDate),amount:checkprintMoney(d.amount),amountPaid:0}))};
      lines.push(...cvExportRows(voucher,format));
    }
    const stamp=String(source.transaction_date??new Date().toISOString().slice(0,10));const content=format==='metrobank'?mbCcws(lines,stamp,Number(source.batch_no??0)):lines.join('\r\n')+'\r\n';
    await this.db.raw(`UPDATE \`${schema}\`.\`0_cv_header\` SET check_printed=1 WHERE bank_trans_id IN (${idsSql})`,ids);
    return{filename:format==='metrobank'?`CCWS_${String(source.batch_no??'00').padStart(2,'0')}.txt`:'AUB_Checks.txt',contentType:'text/plain; charset=utf-8',content};
  }

  async markPrinted(query: unknown): Promise<{ ok: true }> {
    const input=this.input(query); const schema=await this.schema(input.branch);
    const result=await this.db.raw(`UPDATE \`${schema}\`.\`0_cv_header\` SET cv_printed=1 WHERE cv_no=?`,[input.cvNo]);
    if (!result) throw new NotFoundException('Check Voucher was not found.');
    return {ok:true};
  }

  async checkAccounts(query: unknown): Promise<unknown[]> {
    const input=this.inputBranch(query); const schema=await this.schema(input.branch);
    const user=Number((input.source.user_id as unknown)??0), access=Number((input.source.access as unknown)??0);
    return checkprintRows(await this.db.raw(`SELECT ca.*,ba.* FROM \`${schema}\`.\`0_check_account\` ca
      JOIN \`${schema}\`.\`0_bank_accounts\` ba ON ba.account_code=ca.bank_ref
      WHERE (?=2 OR ca.user_id=?) ORDER BY ba.bank_name,ba.bank_account_name`,[access,user]));
  }

  async unassignedAccounts(query: unknown): Promise<unknown[]> {
    const {branch,source}=this.inputBranch(query);const schema=await this.schema(branch);const user=Number(source.user_id??0);
    return checkprintRows(await this.db.raw(`SELECT ba.* FROM \`${schema}\`.\`0_bank_accounts\` ba WHERE ba.account_type=1
      AND ba.account_code NOT IN (SELECT bank_ref FROM \`${schema}\`.\`0_check_account\` WHERE user_id=?) ORDER BY ba.bank_name,ba.bank_account_name`,[user]));
  }

  async saveCheckAccount(body:unknown):Promise<{id:number}> {
    const x=body&&typeof body==='object'?body as Record<string,unknown>:{};const branch=Number(x.branch),id=Number(x.account_id??0),bankRef=String(x.bank_ref??'').trim(),next=String(x.next_reference??'').trim(),start=String(x.booklet_start??'').trim(),end=String(x.booklet_end??'').trim(),writer=Number(x.def_check_writer),user=Number(x.user_id??0);
    if(!Number.isInteger(branch)||branch<0||(!id&&!bankRef)||!next||!start||!end||!writer)throw new BadRequestException('Bank, next check number, booklet range, and check writer are required.');
    const schema=await this.schema(branch);
    if(id){await this.db.raw(`UPDATE \`${schema}\`.\`0_check_account\` SET next_reference=?,booklet_start=?,booklet_end=?,def_check_writer=? WHERE account_id=?`,[next,start,end,writer,id]);return{id};}
    const result=await this.db.raw(`INSERT INTO \`${schema}\`.\`0_check_account\` (bank_ref,next_reference,booklet_start,booklet_end,def_check_writer,user_id) VALUES (?,?,?,?,?,?)`,[bankRef,next,start,end,writer,user]);
    return{id:Number((result as any)?.[0]?.insertId??0)};
  }

  async deleteCheckAccount(query:unknown):Promise<{ok:true}> {
    const x=query&&typeof query==='object'?query as Record<string,unknown>:{};const branch=Number(x.branch),id=Number(x.account_id);
    if(!Number.isInteger(branch)||branch<0||!Number.isInteger(id)||id<=0)throw new BadRequestException('Branch and checking account are required.');const schema=await this.schema(branch);
    const result=checkprintRows<any>(await this.db.raw(`SELECT COUNT(*) AS count FROM \`${schema}\`.\`0_check_trans\` ct JOIN \`${schema}\`.\`0_bank_trans\` bt ON bt.id=ct.bank_trans_id JOIN \`${schema}\`.\`0_check_account\` ca ON ca.account_id=ct.cheque_bank_id JOIN \`${schema}\`.\`0_bank_accounts\` ba ON ba.account_code=ca.bank_ref WHERE ca.account_id=?`,[id]));
    if(Number(result[0]?.count)>0)throw new BadRequestException('Cannot delete a checking account while it has issued checks.');
    await this.db.raw(`DELETE FROM \`${schema}\`.\`0_check_account\` WHERE account_id=?`,[id]);return{ok:true};
  }

  async checks(query: unknown): Promise<unknown[]> {
    const input=this.inputBranch(query); const schema=await this.schema(input.branch);
    return checkprintRows(await this.db.raw(`SELECT a.*,b.bank_name,b.bank_account_name FROM \`${schema}\`.\`0_check_account\` a
      JOIN \`${schema}\`.\`0_bank_accounts\` b ON b.account_code=a.bank_ref ORDER BY b.bank_name`));
  }

  async issue(body: unknown): Promise<{id:number;checkRef:string}> {
    const x=body&&typeof body==='object'?body as Record<string,unknown>:{};
    const branch=Number(x.branch),transNo=Number(x.trans_no),bankId=Number(x.bank_id),ref=String(x.check_ref??'').trim();
    if(!Number.isInteger(branch)||branch<0||!Number.isInteger(transNo)||transNo<=0||!ref||!Number.isInteger(bankId)||bankId<=0) throw new BadRequestException('Branch, payment, bank, and check number are required.');
    const schema=await this.schema(branch);
    const result=checkprintRows<any>(await this.db.raw(`SELECT id FROM \`${schema}\`.\`0_check_trans\` WHERE check_ref=? AND cheque_bank_id=?`,[ref,bankId]));
    if(result.length) throw new BadRequestException('The check number is already in use for this bank.');
    const payment=checkprintRows<any>(await this.db.raw(`SELECT id FROM \`${schema}\`.\`0_bank_trans\` WHERE trans_no=? AND type=22 LIMIT 1`,[transNo]))[0];
    if(!payment) throw new NotFoundException('Supplier payment was not found.');
    const write=await this.db.raw(`INSERT INTO \`${schema}\`.\`0_check_trans\` (check_ref,bank_trans_id,cheque_bank_id) VALUES (?,?,?)`,[ref,payment.id,bankId]);
    return {id:Number((write as any)?.[0]?.insertId??0),checkRef:ref};
  }

  private input(query:unknown):{branch:number;cvNo:string}{const x=query&&typeof query==='object'?query as Record<string,unknown>:{};const branch=Number(x.branch),cvNo=String(x.cv_no??'').trim();if(!Number.isInteger(branch)||branch<0||!cvNo)throw new BadRequestException('A valid branch and CV number are required.');return{branch,cvNo};}
  private inputBranch(query:unknown):{branch:number;source:Record<string,unknown>}{const source=query&&typeof query==='object'?query as Record<string,unknown>:{};const branch=Number(source.branch);if(!Number.isInteger(branch)||branch<0)throw new BadRequestException('A valid branch is required.');return{branch,source};}
  private async schema(branch:number):Promise<string>{const result=await this.db.raw(`SELECT id,config_db_key AS configDbKey,aria_db AS ariaDb FROM transfers.\`0_branches\` WHERE inactive=0 AND (config_db_key=? OR id=?)`,[branch,branch]);const rows=checkprintRows<any>(result);const row=rows.find(x=>Number(x.configDbKey)===branch)??rows.find(x=>Number(x.id)===branch);const schema=String(row?.ariaDb??'').trim();if(!IDENTIFIER.test(schema))throw new NotFoundException('Selected branch was not found.');return schema;}
  private date(value:unknown):string{if(!value)return '';if(value instanceof Date)return value.toISOString().slice(0,10);return String(value).slice(0,10);}
  private dateTime(value:unknown):string{if(!value)return '';return value instanceof Date?value.toISOString().replace('T',' ').slice(0,19):String(value).slice(0,19);}
}
