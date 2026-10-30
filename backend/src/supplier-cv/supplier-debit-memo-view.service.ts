import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';
import {
  rowsOf,
  signedMoney,
  SUPPLIER_DEBIT_MEMO,
  TRANS_TYPE_NAMES,
  type SupplierDebitMemoView,
} from './supplier-transaction.types.js';

@Injectable()
export class SupplierDebitMemoViewService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async view(schema: string, transNo: number): Promise<SupplierDebitMemoView> {
    const header = rowsOf<{
      supplierReference: string | null; supplierName: string | null;
      tranDate: string | null; specialReference: string | null;
    }>(await this.db.raw(
      `SELECT st.supp_reference AS supplierReference, s.supp_name AS supplierName,
         DATE_FORMAT(st.tran_date, '%Y-%m-%d') AS tranDate, st.special_reference AS specialReference
       FROM \`${schema}\`.\`0_supp_trans\` st
       LEFT JOIN \`${schema}\`.\`0_suppliers\` s ON s.supplier_id = st.supplier_id
       WHERE st.type = ? AND st.trans_no = ? LIMIT 1`,
      [SUPPLIER_DEBIT_MEMO, transNo],
    ))[0];
    if (!header) throw new NotFoundException('Supplier debit memo was not found.');

    const company = rowsOf<{
      name: string | null; address: string | null; dimensionCount: number | string | null;
    }>(await this.db.raw(
      `SELECT coy_name AS name, postal_address AS address, use_dimension AS dimensionCount
       FROM \`${schema}\`.\`0_company\` LIMIT 1`,
    ))[0];

    const queryGl = async (table: '0_gl_trans' | '0_gl_trans_temp') => rowsOf<{
      account: string | null; accountName: string | null; reference: string | null;
      amount: number | string | null; dimension1: string | null; dimension2: string | null;
      memo: string | null; counter: number | string | null;
    }>(await this.db.raw(
      `SELECT gl.account, cm.account_name AS accountName, COALESCE(refs.reference, '') AS reference,
         gl.amount, CONCAT_WS(' - ', d1.reference, d1.name) AS dimension1,
         CONCAT_WS(' - ', d2.reference, d2.name) AS dimension2, gl.memo_, gl.counter
       FROM \`${schema}\`.\`${table}\` gl
       LEFT JOIN \`${schema}\`.\`0_chart_master\` cm ON cm.account_code = gl.account
       LEFT JOIN \`${schema}\`.\`0_refs\` refs ON refs.type = gl.type AND refs.id = gl.type_no
       LEFT JOIN \`${schema}\`.\`0_dimensions\` d1 ON d1.id = gl.dimension_id
       LEFT JOIN \`${schema}\`.\`0_dimensions\` d2 ON d2.id = gl.dimension2_id
       WHERE gl.type = ? AND gl.type_no = ? ORDER BY gl.amount DESC, gl.counter ASC`,
      [SUPPLIER_DEBIT_MEMO, transNo],
    ));
    let ledger = await queryGl('0_gl_trans');
    if (ledger.length === 0) ledger = await queryGl('0_gl_trans_temp');

    const audit = rowsOf<{ preparedBy: string | null }>(await this.db.raw(
      `SELECT u.user_id AS preparedBy FROM \`${schema}\`.\`0_audit_trail\` a
       LEFT JOIN \`${schema}\`.\`0_users\` u ON u.id = a.user
       WHERE a.type = ? AND a.trans_no = ? AND a.description = '' ORDER BY a.id LIMIT 1`,
      [SUPPLIER_DEBIT_MEMO, transNo],
    ))[0];
    let preparedBy = audit?.preparedBy ?? '';
    let approvedBy: string[] = [];
    if (header.specialReference) {
      const sdma = rowsOf<{ preparedBy: string | null; approval1: string | null; approval2: string | null }>(await this.db.raw(
        `SELECT p.user_id AS preparedBy, a1.user_id AS approval1, a2.user_id AS approval2
         FROM \`${schema}\`.\`0_sdma\` d
         LEFT JOIN \`${schema}\`.\`0_users\` p ON p.id = d.prepared_by
         LEFT JOIN \`${schema}\`.\`0_users\` a1 ON a1.id = d.approval_1
         LEFT JOIN \`${schema}\`.\`0_users\` a2 ON a2.id = d.approval_2
         WHERE d.reference = ? LIMIT 1`,
        [header.supplierReference],
      ))[0];
      if (sdma) {
        preparedBy = sdma.preparedBy ?? '';
        approvedBy = [sdma.approval1, sdma.approval2].filter((name): name is string => Boolean(name));
      }
    }
    const voided = rowsOf<{ id: number | string }>(await this.db.raw(
      `SELECT id FROM \`${schema}\`.\`0_voided\` WHERE type = ? AND id = ? LIMIT 1`,
      [SUPPLIER_DEBIT_MEMO, transNo],
    )).length > 0;

    return {
      viewKind: 'general-ledger',
      transNo,
      transactionType: TRANS_TYPE_NAMES[SUPPLIER_DEBIT_MEMO],
      companyName: company?.name ?? '',
      companyAddress: company?.address ?? '',
      dimensionCount: Math.max(0, Math.min(2, Number(company?.dimensionCount) || 0)),
      reference: ledger[0]?.reference ?? '',
      supplierReference: header.supplierReference ?? '',
      supplierName: header.supplierName ?? '',
      tranDate: header.tranDate ?? '',
      voided,
      glItems: ledger.filter((row) => Number(row.amount) !== 0).map((row) => {
        const amount = signedMoney(row.amount);
        return {
          account: row.account ?? '', accountName: row.accountName ?? '',
          dimension1: row.dimension1 ?? '', dimension2: row.dimension2 ?? '',
          debit: amount > 0 ? amount : 0, credit: amount < 0 ? -amount : 0, memo: row.memo ?? '',
        };
      }),
      preparedBy,
      approvedBy,
    };
  }
}
