import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';
import {
  rowsOf,
  signedMoney,
  SUPPLIER_PAYMENT,
  TRANS_TYPE_NAMES,
  type SupplierPaymentView,
} from './supplier-transaction.types.js';

@Injectable()
export class SupplierPaymentViewService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async view(schema: string, transNo: number): Promise<SupplierPaymentView> {
    const header = rowsOf<{
      reference: string | null; supplierReference: string | null; supplierName: string | null;
      tranDate: string | null; bankAccountName: string | null; bankCurrency: string | null;
      supplierCurrency: string | null; amount: number | string | null; supplierAmount: number | string | null;
      companyCurrency: string | null;
      ewt: number | string | null; accountType: number | string | null;
    }>(await this.db.raw(
      `SELECT st.reference, st.supp_reference AS supplierReference, s.supp_name AS supplierName,
         DATE_FORMAT(b.trans_date, '%Y-%m-%d') AS tranDate,
         ba.bank_account_name AS bankAccountName, ba.bank_curr_code AS bankCurrency,
         s.curr_code AS supplierCurrency, co.curr_default AS companyCurrency, ABS(b.amount) AS amount,
         ABS(st.ov_amount + st.ov_gst - st.ov_discount) AS supplierAmount,
         ABS(st.ewt) AS ewt, ba.account_type AS accountType
       FROM \`${schema}\`.\`0_supp_trans\` st
       LEFT JOIN \`${schema}\`.\`0_suppliers\` s ON s.supplier_id = st.supplier_id
       LEFT JOIN \`${schema}\`.\`0_bank_trans\` b ON b.type = ? AND b.trans_no = st.trans_no
       LEFT JOIN \`${schema}\`.\`0_bank_accounts\` ba ON ba.id = b.bank_act
       LEFT JOIN \`${schema}\`.\`0_company\` co ON 1 = 1
       WHERE st.type = ? AND st.trans_no = ? LIMIT 1`,
      [SUPPLIER_PAYMENT, SUPPLIER_PAYMENT, transNo],
    ))[0];
    if (!header) throw new NotFoundException('Supplier payment was not found.');

    const comments = rowsOf<{ memo: string | null }>(await this.db.raw(
      `SELECT memo_ AS memo FROM \`${schema}\`.\`0_comments\`
       WHERE type = ? AND id = ? ORDER BY date_`,
      [SUPPLIER_PAYMENT, transNo],
    ));
    const chequeDetails = rowsOf<{
      payTo: string | null; bank: string | null; branch: string | null; number: string | null;
      date: string | null; amount: number | string | null;
    }>(await this.db.raw(
      `SELECT cd.pay_to AS payTo, cd.bank, cd.branch, cd.chk_number AS number,
         DATE_FORMAT(cd.chk_date, '%Y-%m-%d') AS date, ABS(cd.chk_amount) AS amount
       FROM \`${schema}\`.\`0_bank_trans\` b
       JOIN \`${schema}\`.\`0_cheque_details\` cd ON cd.bank_trans_id = b.id
       WHERE b.type = ? AND b.trans_no = ? ORDER BY cd.id`,
      [SUPPLIER_PAYMENT, transNo],
    ));
    const allocations = rowsOf<{
      transType: number | string; transNo: number | string; reference: string | null;
      amount: number | string; date: string | null;
    }>(await this.db.raw(
      `SELECT CASE WHEN a.trans_type_from = ${SUPPLIER_PAYMENT} THEN a.trans_type_to ELSE a.trans_type_from END AS transType,
         CASE WHEN a.trans_type_from = ${SUPPLIER_PAYMENT} THEN a.trans_no_to ELSE a.trans_no_from END AS transNo,
         COALESCE(st.reference, '') AS reference, ABS(a.amt) AS amount,
         DATE_FORMAT(a.date_alloc, '%Y-%m-%d') AS date
       FROM \`${schema}\`.\`0_supp_allocations\` a
       LEFT JOIN \`${schema}\`.\`0_supp_trans\` st
         ON st.type = CASE WHEN a.trans_type_from = ${SUPPLIER_PAYMENT} THEN a.trans_type_to ELSE a.trans_type_from END
         AND st.trans_no = CASE WHEN a.trans_type_from = ${SUPPLIER_PAYMENT} THEN a.trans_no_to ELSE a.trans_no_from END
       WHERE (a.trans_no_from = ? AND a.trans_type_from = ?)
          OR (a.trans_no_to = ? AND a.trans_type_to = ?)
       ORDER BY a.date_alloc, a.id`,
      [transNo, SUPPLIER_PAYMENT, transNo, SUPPLIER_PAYMENT],
    ));
    const voided = rowsOf<{ id: number | string }>(await this.db.raw(
      `SELECT id FROM \`${schema}\`.\`0_voided\` WHERE type = ? AND id = ? LIMIT 1`,
      [SUPPLIER_PAYMENT, transNo],
    )).length > 0;
    const paymentTypes: Record<number, string> = { 0: 'Transfer', 1: 'Cheque', 2: 'Credit', 3: 'Cash' };

    return {
      viewKind: 'payment',
      transNo,
      transactionType: TRANS_TYPE_NAMES[SUPPLIER_PAYMENT],
      reference: header.reference ?? '',
      supplierReference: header.supplierReference ?? '',
      supplierName: header.supplierName ?? '',
      tranDate: header.tranDate ?? '',
      voided,
      bankAccountName: header.bankAccountName ?? '',
      bankCurrency: header.bankCurrency ?? '',
      supplierCurrency: header.supplierCurrency ?? '',
      companyCurrency: header.companyCurrency ?? '',
      paymentType: paymentTypes[Number(header.accountType)] ?? '',
      amount: signedMoney(header.amount),
      supplierAmount: signedMoney(header.supplierAmount),
      ewt: signedMoney(header.ewt),
      comments: comments.map((row) => (row.memo ?? '').trim()).filter(Boolean),
      chequeDetails: chequeDetails.map((row) => ({
        payTo: row.payTo ?? '', bank: row.bank ?? '', branch: row.branch ?? '', number: row.number ?? '',
        date: row.date ?? '', amount: signedMoney(row.amount),
      })),
      allocations: voided ? [] : allocations.map((row) => ({
        transactionType: TRANS_TYPE_NAMES[Number(row.transType)] ?? `Type ${row.transType}`,
        transactionNumber: Number(row.transNo), reference: row.reference ?? '',
        amount: signedMoney(row.amount), date: row.date ?? '',
      })),
    };
  }
}
