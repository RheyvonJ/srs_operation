import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';
import {
  rowsOf,
  signedMoney,
  SUPPLIER_INVOICE,
  type SupplierInvoiceView,
} from './supplier-transaction.types.js';

@Injectable()
export class SupplierApVoucherService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async view(schema: string, transNo: number): Promise<SupplierInvoiceView> {
    const transaction = rowsOf<{
      reference: string | null; supplierReference: string | null; supplierName: string | null;
      tranDate: string | null; dueDate: string | null; deliveryDate: string | null; currency: string | null;
      amount: number | string | null; gst: number | string | null; discount: number | string | null;
      ewt: number | string | null; ewtPercent: number | string | null; nonTrade: number | string | null;
      taxIncluded: number | string | null;
    }>(await this.db.raw(
      `SELECT st.reference, st.supp_reference AS supplierReference, s.supp_name AS supplierName,
         DATE_FORMAT(st.tran_date, '%Y-%m-%d') AS tranDate,
         DATE_FORMAT(st.due_date, '%Y-%m-%d') AS dueDate,
         DATE_FORMAT(st.del_date, '%Y-%m-%d') AS deliveryDate,
         st.ov_amount AS amount, st.ov_gst AS gst, st.ov_discount AS discount,
         st.ewt, st.ewt_percent AS ewtPercent, st.non_trade AS nonTrade,
         CAST(0 AS UNSIGNED) AS taxIncluded, c.curr_abrev AS currency
       FROM \`${schema}\`.\`0_supp_trans\` st
       LEFT JOIN \`${schema}\`.\`0_suppliers\` s ON s.supplier_id = st.supplier_id
       LEFT JOIN \`${schema}\`.\`0_currencies\` c ON c.curr_abrev = s.curr_code
       WHERE st.type = ? AND st.trans_no = ? LIMIT 1`,
      [SUPPLIER_INVOICE, transNo],
    ))[0];
    if (!transaction) throw new NotFoundException('Supplier invoice was not found.');

    const comments = rowsOf<{ memo: string | null }>(await this.db.raw(
      `SELECT memo_ AS memo FROM \`${schema}\`.\`0_comments\`
       WHERE type = ? AND id = ? ORDER BY date_`,
      [SUPPLIER_INVOICE, transNo],
    ));
    const invoiceItems = rowsOf<{
      account: string | null; accountName: string | null; dimension1: string | null; dimension2: string | null;
      amount: number | string | null; memo: string | null; quantity: number | string | null;
      unitTax: number | string | null; unit: string | null;
      discPercent1: number | string | null; discPercent2: number | string | null; discPercent3: number | string | null;
      discAmount1: number | string | null; discAmount2: number | string | null; discAmount3: number | string | null;
      delivery: number | string | null;
      item: string | null; description: string | null; isTaxAccount: number | string;
    }>(await this.db.raw(
      `SELECT i.gl_code AS account, cm.account_name AS accountName,
         '' AS dimension1, '' AS dimension2,
         i.unit_price AS amount, i.unit_tax AS unitTax, i.memo_, i.quantity,
         i.i_uom AS unit, i.stock_id AS item, i.description,
         po.disc_percent1 AS discPercent1, po.disc_percent2 AS discPercent2, po.disc_percent3 AS discPercent3,
         po.disc_amount1 AS discAmount1, po.disc_amount2 AS discAmount2, po.disc_amount3 AS discAmount3,
         grn.grn_batch_id AS delivery,
         EXISTS (SELECT 1 FROM \`${schema}\`.\`0_tax_types\` tt WHERE tt.purchasing_gl_code = i.gl_code) AS isTaxAccount
       FROM \`${schema}\`.\`0_supp_invoice_items\` i
       LEFT JOIN \`${schema}\`.\`0_grn_items\` grn ON grn.id = i.grn_item_id
       LEFT JOIN \`${schema}\`.\`0_purch_order_details\` po ON po.po_detail_item = i.po_detail_item_id
       LEFT JOIN \`${schema}\`.\`0_chart_master\` cm ON cm.account_code = i.gl_code
       WHERE i.supp_trans_type = ? AND i.supp_trans_no = ? ORDER BY i.id`,
      [SUPPLIER_INVOICE, transNo],
    ));
    const glItems = invoiceItems.filter((row) => Number(row.account) !== 0);
    const grnItems = invoiceItems.filter((row) => Number(row.account) === 0);
    const taxes = rowsOf<{ name: string | null; rate: number | string | null; amount: number | string | null }>(await this.db.raw(
      `SELECT tt.name, tt.rate, td.amount FROM \`${schema}\`.\`0_trans_tax_details\` td
       LEFT JOIN \`${schema}\`.\`0_tax_types\` tt ON tt.id = td.tax_type_id
       WHERE td.trans_type = ? AND td.trans_no = ? ORDER BY td.tax_type_id`,
      [SUPPLIER_INVOICE, transNo],
    ));

    const preferences = rowsOf<{
      purchaseNonVat: string | null; purchaseVat: string | null; discountAccount: string | null;
      companyCurrency: string | null;
    }>(await this.db.raw(
      `SELECT purchase_non_vat AS purchaseNonVat, purchase_vat AS purchaseVat,
         pyt_discount_act AS discountAccount, curr_default AS companyCurrency
       FROM \`${schema}\`.\`0_company\` LIMIT 1`,
    ))[0];

    const glByAccount = new Map(rowsOf<{ account: string | null; amount: number | string | null }>(await this.db.raw(
      `SELECT account, amount FROM \`${schema}\`.\`0_gl_trans\`
       WHERE type = ? AND type_no = ? ORDER BY counter`,
      [SUPPLIER_INVOICE, transNo],
    )).map((row) => [String(row.account ?? ''), Math.abs(Number(row.amount) || 0)]));
    const taxIncluded = Number(transaction.taxIncluded) !== 0;
    const glTotal = glItems.reduce((sum, row) => sum + (
      taxIncluded || Number(row.isTaxAccount) === 0 ? Number(row.amount) || 0 : 0
    ), 0);
    const formattedGrnItems = grnItems.map((row) => {
      const quantity = Math.abs(Number(row.quantity) || 0);
      const price = (Number(row.amount) || 0) + (Number(row.unitTax) || 0);
      const discounts = [row.discPercent1, row.discPercent2, row.discPercent3]
        .map(Number).filter((value) => Number.isFinite(value) && value !== 0)
        .map((value) => `${value}%`);
      discounts.push(...[row.discAmount1, row.discAmount2, row.discAmount3]
        .map(Number).filter((value) => Number.isFinite(value) && value !== 0)
        .map(String));
      return {
        delivery: '', item: row.description ?? '', unit: row.unit ?? '', description: row.description ?? '', quantity,
        price: signedMoney(price), discount: discounts.join(', '), amount: signedMoney(quantity * price),
      };
    });
    const voided = rowsOf<{ id: number | string }>(await this.db.raw(
      `SELECT id FROM \`${schema}\`.\`0_voided\` WHERE type = ? AND id = ? LIMIT 1`,
      [SUPPLIER_INVOICE, transNo],
    )).length > 0;

    return {
      viewKind: 'invoice',
      transNo,
      transactionType: 'AP Voucher',
      reference: transaction.reference ?? '',
      supplierReference: transaction.supplierReference ?? '',
      supplierName: transaction.supplierName ?? '',
      tranDate: transaction.tranDate ?? '',
      dueDate: transaction.dueDate ?? '',
      deliveryDate: transaction.deliveryDate ?? '',
      currency: transaction.currency ?? '',
      companyCurrency: preferences?.companyCurrency ?? '',
      nonTrade: Number(transaction.nonTrade) !== 0,
      comments: comments.map((row) => (row.memo ?? '').trim()).filter(Boolean),
      glItems: glItems.map((row) => ({
        account: row.account ?? '', accountName: row.accountName ?? '',
        dimension1: row.dimension1 ?? '', dimension2: row.dimension2 ?? '',
        amount: signedMoney(row.amount), memo: row.memo ?? '',
      })),
      glItemsTotal: signedMoney(glItems.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)),
      grnItems: formattedGrnItems,
      grnTotal: signedMoney(formattedGrnItems.reduce((sum, row) => sum + row.amount, 0)),
      purchaseNonVat: glByAccount.get(preferences?.purchaseNonVat ?? '') ?? 0,
      purchaseVat: glByAccount.get(preferences?.purchaseVat ?? '') ?? 0,
      taxes: taxes.map((row) => ({ name: row.name ?? '', rate: Number(row.rate) || 0, amount: signedMoney(row.amount) })),
      amount: signedMoney(Number(transaction.amount) + Number(transaction.gst)),
      glTotal: signedMoney(glTotal),
      discount: signedMoney(transaction.discount),
      discountLabel: preferences
        ? glByAccount.has(preferences.discountAccount ?? '') ? 'Purchase Discount:' : 'Purchase Returns:'
        : 'Purchase Discount / Returns:',
      ewt: signedMoney(transaction.ewt),
      ewtPercent: Number(transaction.ewtPercent) || 0,
      voided,
    };
  }
}
