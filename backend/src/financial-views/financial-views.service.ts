import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';

const IDENTIFIER = /^[A-Za-z0-9_]+$/;
const rows = <T = Record<string, unknown>>(value: unknown): T[] =>
  Array.isArray(value) && Array.isArray(value[0]) ? (value[0] as T[]) : [];
const text = (value: unknown) => (value == null ? '' : String(value));
const amount = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

@Injectable()
export class FinancialViewsService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async gl(query: unknown) {
    const p = this.params(query, 'trans_no', true);
    const type = p.typeId;
    const no = p.transNo;
    const schema = await this.schema(p.branch);
    const header =
      rows<any>(
        await this.db.raw(
          `SELECT COALESCE(r.reference,'') AS reference,
      DATE_FORMAT(COALESCE(st.tran_date,bt.trans_date,gl.tran_date),'%Y-%m-%d') AS tranDate,
      COALESCE(st.supplier_id,bt.person_id,gl.person_id) AS personId,COALESCE(bt.person_type_id,gl.person_type_id) AS personType,
      st.supp_reference AS supplierReference,st.special_reference AS specialReference,s.supp_name AS supplierName,
      c.name AS customerName,co.coy_name AS companyName,co.postal_address AS companyAddress,co.use_dimension AS dimensionCount
      FROM (SELECT ? AS type_no, ? AS type) wanted
      LEFT JOIN \`${schema}\`.\`0_refs\` r ON r.type=wanted.type AND r.id=wanted.type_no
      LEFT JOIN \`${schema}\`.\`0_supp_trans\` st ON st.type=wanted.type AND st.trans_no=wanted.type_no
      LEFT JOIN \`${schema}\`.\`0_bank_trans\` bt ON bt.type=wanted.type AND bt.trans_no=wanted.type_no
      LEFT JOIN \`${schema}\`.\`0_gl_trans\` gl ON gl.type=wanted.type AND gl.type_no=wanted.type_no
      LEFT JOIN \`${schema}\`.\`0_suppliers\` s ON s.supplier_id=COALESCE(st.supplier_id,bt.person_id,gl.person_id)
      LEFT JOIN \`${schema}\`.\`0_debtors_master\` c ON c.debtor_no=COALESCE(bt.person_id,gl.person_id)
      LEFT JOIN \`${schema}\`.\`0_company\` co ON 1=1 ORDER BY gl.counter LIMIT 1`,
          [no, type],
        ),
      )[0] ?? {};
    let entries = await this.glRows(schema, '0_gl_trans', type, no);
    if (!entries.length)
      entries = await this.glRows(schema, '0_gl_trans_temp', type, no);
    if (type === 13) {
      const grouped = new Map<string, any>();
      for (const item of entries) {
        const current = grouped.get(item.account) ?? { ...item, amount: 0 };
        current.amount += Number(item.amount) || 0;
        grouped.set(item.account, current);
      }
      entries = [...grouped.values()].filter((x) => x.amount !== 0);
    }
    const supplemental =
      type === 52 || type === 53
        ? rows<any>(
            await this.db.raw(
              `SELECT supp_reference AS supplierReference,DATE_FORMAT(tran_date,'%Y-%m-%d') AS tranDate FROM \`${schema}\`.\`0_supp_trans\` WHERE type=? AND trans_no=? LIMIT 1`,
              [type, no],
            ),
          )[0]
        : null;
    const comments =
      type === 52 || type === 53
        ? []
        : rows<any>(
            await this.db.raw(
              `SELECT memo_ AS memo FROM \`${schema}\`.\`0_comments\` WHERE type=? AND id=? ORDER BY date_`,
              [type, no],
            ),
          ).map((x) => text(x.memo));
    const voided =
      rows<any>(
        await this.db.raw(
          `SELECT id FROM \`${schema}\`.\`0_voided\` WHERE type=? AND id=? LIMIT 1`,
          [type, no],
        ),
      ).length > 0;
    const audit = rows<any>(
      await this.db.raw(
        `SELECT u.user_id AS userId FROM \`${schema}\`.\`0_audit_trail\` a LEFT JOIN \`${schema}\`.\`0_users\` u ON u.id=a.user WHERE a.type=? AND a.trans_no=? AND a.description='' ORDER BY a.id LIMIT 1`,
        [type, no],
      ),
    )[0];
    const reference = text(header.reference) || text(entries[0]?.reference);
    return {
      type,
      transNo: no,
      transactionType: this.typeName(type),
      reference,
      tranDate: text(supplemental?.tranDate || header.tranDate),
      supplierReference: text(
        supplemental?.supplierReference || header.supplierReference,
      ),
      personName:
        type === 0 ? '' : text(header.supplierName || header.customerName),
      companyName: text(header.companyName),
      companyAddress: text(header.companyAddress),
      dimensionCount: Math.max(
        0,
        Math.min(2, Number(header.dimensionCount) || 0),
      ),
      comments,
      voided,
      preparedBy: text(audit?.userId),
      entries,
      totalDebit: amount(
        entries.reduce((s: number, x: any) => s + (Number(x.debit) || 0), 0),
      ),
      totalCredit: amount(
        entries.reduce((s: number, x: any) => s + (Number(x.credit) || 0), 0),
      ),
    };
  }

  async bank(query: unknown) {
    const p = this.params(query, 'trans_no', true);
    const schema = await this.schema(p.branch);
    const type = p.typeId,
      no = p.transNo;
    if (![1, 2, 4].includes(type))
      throw new BadRequestException('Unsupported bank transaction type.');
    const records = rows<any>(
      await this.db.raw(
        `SELECT bt.*,ba.bank_account_name AS bankAccountName,ba.account_code AS accountCode,ba.bank_curr_code AS bankCurrency,ba.account_type AS accountType,
      ba.bank_name AS bankName,COALESCE(s.supp_name,c.name,'') AS personName,co.curr_default AS companyCurrency,co.use_dimension AS dimensionCount,
      DATE_FORMAT(bt.trans_date,'%Y-%m-%d') AS date,COALESCE(r.reference,bt.ref) AS reference
      FROM \`${schema}\`.\`0_bank_trans\` bt JOIN \`${schema}\`.\`0_bank_accounts\` ba ON ba.id=bt.bank_act
      LEFT JOIN \`${schema}\`.\`0_refs\` r ON r.type=bt.type AND r.id=bt.trans_no
      LEFT JOIN \`${schema}\`.\`0_suppliers\` s ON bt.person_type_id=3 AND s.supplier_id=bt.person_id
      LEFT JOIN \`${schema}\`.\`0_debtors_master\` c ON bt.person_type_id=2 AND c.debtor_no=bt.person_id
      LEFT JOIN \`${schema}\`.\`0_company\` co ON 1=1 WHERE bt.type=? AND bt.trans_no=? ORDER BY bt.amount`,
        [type, no],
      ),
    );
    if (!records.length)
      throw new NotFoundException('Bank transaction was not found.');
    const transfers = type === 4 ? records : [];
    const main = type === 2 ? records[0] : type === 1 ? records[0] : null;
    const [items, checks, comments, allocations] = await Promise.all([
      this.glRows(schema, '0_gl_trans', type, no),
      rows<any>(
        await this.db.raw(
          `SELECT cd.bank,cd.branch,cd.chk_number AS checkNumber,DATE_FORMAT(cd.chk_date,'%Y-%m-%d') AS checkDate,ABS(cd.chk_amount) AS amount,cd.status,cd.pay_to AS payTo
        FROM \`${schema}\`.\`0_cheque_details\` cd JOIN \`${schema}\`.\`0_bank_trans\` bt ON cd.bank_trans_id=bt.id AND cd.bank_id=bt.bank_act
        WHERE bt.type=? AND bt.trans_no=? AND cd.type=bt.type ORDER BY cd.id`,
          [type, no],
        ),
      ),
      rows<any>(
        await this.db.raw(
          `SELECT memo_ AS memo FROM \`${schema}\`.\`0_comments\` WHERE type=? AND id=? ORDER BY date_`,
          [type, no],
        ),
      ).map((x) => text(x.memo)),
      this.allocations(schema, type, no),
    ]);
    const voided =
      rows<any>(
        await this.db.raw(
          `SELECT id FROM \`${schema}\`.\`0_voided\` WHERE type=? AND id=? LIMIT 1`,
          [type, no],
        ),
      ).length > 0;
    const dimensionCount = Number(records[0].dimensionCount);
    const transfer =
      transfers.length > 0
        ? {
            from: transfers.find((x) => Number(x.amount) < 0),
            to: transfers.find((x) => Number(x.amount) >= 0),
          }
        : null;
    return {
      type,
      transNo: no,
      title:
        type === 1 ? 'GL Payment' : type === 2 ? 'GL Deposit' : 'Bank Transfer',
      date: text(records[0].date),
      reference: text(records[0].reference),
      voided,
      comments,
      amount: amount(
        Math.abs(Number(main?.amount ?? transfer?.from?.amount ?? 0)),
      ),
      bankAccount: text(
        main?.bankAccountName || transfer?.from?.bankAccountName,
      ),
      bankName: text(main?.bankName || transfer?.from?.bankName),
      currency: text(main?.bankCurrency || transfer?.from?.bankCurrency),
      companyCurrency: text(records[0].companyCurrency),
      accountType: Number(
        main?.accountType ?? transfer?.from?.accountType ?? 0,
      ),
      personName: text(main?.personName),
      transfer: transfer
        ? {
            fromAccount: text(transfer.from?.bankAccountName),
            fromCurrency: text(transfer.from?.bankCurrency),
            fromAmount: amount(Math.abs(Number(transfer.from?.amount))),
            toAccount: text(transfer.to?.bankAccountName),
            toCurrency: text(transfer.to?.bankCurrency),
            toAmount: amount(Math.abs(Number(transfer.to?.amount))),
            showBothCurrencies:
              transfer.from?.bankCurrency !== transfer.to?.bankCurrency,
          }
        : null,
      checks,
      items,
      dimensionCount: Math.max(0, Math.min(2, dimensionCount)),
      allocations,
    };
  }

  async batch(query: unknown) {
    const p = this.params(query, 'id');
    const s = await this.schema(p.branch);
    const header = rows<any>(
      await this.db.raw(
        `SELECT b.*,DATE_FORMAT(b.stamp,'%Y-%m-%d') AS date FROM \`${s}\`.\`0_check_issue_batch\` b WHERE b.id=?`,
        [p.transNo],
      ),
    )[0];
    if (!header)
      throw new NotFoundException('Check issuance batch was not found.');
    const details = rows<any>(
      await this.db.raw(
        `SELECT cv.id,cv.cv_no AS cvNo,DATE_FORMAT(cv.cv_date,'%Y-%m-%d') AS cvDate,DATE_FORMAT(cv.due_date,'%Y-%m-%d') AS dueDate,cv.amount,
      bt.id AS bankTransId,cd.bank,cd.chk_number AS checkNumber,cd.pay_to AS payTo,bt2.id AS bankTransId2,cd2.pay_to AS alternatePayTo
      FROM \`${s}\`.\`0_check_issue_batch_cv\` bc JOIN \`${s}\`.\`0_cv_header\` cv ON cv.id=bc.cv_id
      LEFT JOIN \`${s}\`.\`0_bank_trans\` bt ON bt.id=bc.bank_trans_id
      LEFT JOIN \`${s}\`.\`0_cheque_details\` cd ON cd.bank_trans_id=bt.id
      LEFT JOIN \`${s}\`.\`0_check_issue_batch_cv\` bc2 ON bc2.cv_id=bc.cv_id AND bc2.bank_trans_id<>bc.bank_trans_id
      LEFT JOIN \`${s}\`.\`0_bank_trans\` bt2 ON bt2.id=bc2.bank_trans_id
      LEFT JOIN \`${s}\`.\`0_cheque_details\` cd2 ON cd2.bank_trans_id=bt2.id
      WHERE bc.batch_id=? ORDER BY cd.chk_number`,
        [p.transNo],
      ),
    );
    const total = details.reduce(
      (sum: number, x: any) => sum + amount(x.amount),
      0,
    );
    return {
      ...header,
      title:
        Number(header.check_writer) === 1
          ? 'AUB Check'
          : Number(header.check_writer) === 2
            ? 'Metrobank Check'
            : 'Check',
      total,
      details: details.map((x: any) => ({
        ...x,
        payTo:
          x.payTo ||
          `${x.alternatePayTo || ''}${x.alternatePayTo ? ' - VOIDED' : ''}`,
      })),
    };
  }

  async csv(query: unknown) {
    const p = this.params(query, 'trans_no');
    const s = await this.schema(p.branch);
    const header = rows<any>(
      await this.db.raw(
        `SELECT id,csv_file AS filename,DATE_FORMAT(date,'%Y-%m-%d') AS date FROM \`${s}\`.\`0_csv\` WHERE id=? LIMIT 1`,
        [p.transNo],
      ),
    )[0];
    if (!header) throw new NotFoundException('CSV batch was not found.');
    const details = rows<any>(
      await this.db.raw(
        `SELECT cv.id,cv.cv_no AS cvNo,DATE_FORMAT(cv.cv_date,'%Y-%m-%d') AS cvDate,DATE_FORMAT(cv.due_date,'%Y-%m-%d') AS dueDate,cv.email_sent AS emailSent,cv.person_type AS personType,cv.person_id AS personId,cv.amount,
      s.supp_name AS supplierName FROM \`${s}\`.\`0_csv_details\` cd JOIN \`${s}\`.\`0_cv_header\` cv ON cv.id=cd.cv_id
      LEFT JOIN \`${s}\`.\`0_suppliers\` s ON s.supplier_id=CAST(cv.person_id AS UNSIGNED) WHERE cd.csv_id=? ORDER BY cd.id`,
        [p.transNo],
      ),
    );
    return {
      ...header,
      total: details.reduce((sum: number, x: any) => sum + amount(x.amount), 0),
      details,
    };
  }

  async purchaseOrder(query: unknown, discrepancy = false) {
    const p = this.params(query, 'trans_no');
    const s = await this.schema(p.branch);
    const h = rows<any>(
      await this.db.raw(
        `SELECT po.*,DATE_FORMAT(po.ord_date,'%Y-%m-%d') AS date,s.supp_name AS supplierName,s.address AS supplierAddress,s.tax_group_id AS taxGroupId,
      l.location_name AS locationName,r.reference AS orderReference FROM \`${s}\`.\`0_purch_orders\` po LEFT JOIN \`${s}\`.\`0_suppliers\` s ON s.supplier_id=po.supplier_id
      LEFT JOIN \`${s}\`.\`0_locations\` l ON l.loc_code=po.into_stock_location LEFT JOIN \`${s}\`.\`0_refs\` r ON r.type=18 AND r.id=po.order_no WHERE po.order_no=? LIMIT 1`,
        [p.transNo],
      ),
    )[0];
    if (!h) throw new NotFoundException('Purchase order was not found.');
    const items = rows<any>(
      await this.db.raw(
        `SELECT d.*,d.item_code AS itemCode,d.description AS itemDescription,d.p_uom AS unit,d.quantity_ordered AS quantity,d.unit_price AS price,d.quantity_received AS received,d.qty_invoiced AS invoiced,d.extended AS amount,
      d.quantity_ordered_pcs AS poQty,d.quantity_received_pcs AS receivedQty,d.qty_invoiced_pcs AS invoicedQty
      FROM \`${s}\`.\`0_purch_order_details\` d WHERE d.order_no=? ORDER BY d.po_detail_item`,
        [p.transNo],
      ),
    );
    const filtered = discrepancy
      ? items.filter((x) => Number(x.quantity) !== Number(x.received))
      : items;
    const [grns, invoices, taxes, voidRows] = await Promise.all([
      this.db.raw(
        `SELECT g.id,g.reference,DATE_FORMAT(g.delivery_date,'%Y-%m-%d') AS date FROM \`${s}\`.\`0_grn_batch\` g WHERE g.purch_order_no=? ORDER BY g.delivery_date,g.id`,
        [p.transNo],
      ),
      this.db.raw(
        `SELECT st.type,st.trans_no AS transNo,st.tran_date AS date,(st.ov_amount+st.ov_gst+st.ov_discount) AS total FROM \`${s}\`.\`0_supp_trans\` st WHERE st.special_reference=? AND st.type IN (20,21) ORDER BY st.tran_date,st.trans_no`,
        [text(h.reference)],
      ),
      this.db.raw(
        `SELECT t.name,g.rate FROM \`${s}\`.\`0_tax_group_items\` g JOIN \`${s}\`.\`0_tax_types\` t ON t.id=g.tax_type_id WHERE g.tax_group_id=? ORDER BY t.id`,
        [h.taxGroupId],
      ),
      this.db.raw(
        `SELECT id FROM \`${s}\`.\`0_voided\` WHERE type=18 AND id=? LIMIT 1`,
        [p.transNo],
      ),
    ]);
    return {
      orderNo: p.transNo,
      reference: text(h.orderReference || h.reference),
      date: text(h.date),
      supplierId: Number(h.supplier_id),
      supplierName: text(h.supplierName),
      supplierAddress: text(h.supplierAddress),
      location: text(h.locationName),
      deliveryAddress: text(h.delivery_address),
      comments: text(h.comments),
      approved: Number(h.is_approve) !== 0,
      voided: rows(voidRows).length > 0,
      discrepancy,
      items: filtered.map((x: any) => ({
        ...x,
        discounts: [x.disc_percent1, x.disc_percent2, x.disc_percent3]
          .filter(Boolean)
          .map((v: any) => `${v}%`)
          .concat(
            [x.disc_amount1, x.disc_amount2, x.disc_amount3]
              .filter(Boolean)
              .map(String),
          )
          .join(', '),
      })),
      total: filtered.reduce(
        (sum: number, x: any) => sum + amount(x.amount),
        0,
      ),
      taxes: rows(taxes),
      deliveries: rows(grns),
      invoices: rows(invoices),
    };
  }

  async grn(query: unknown) {
    const p = this.params(query, 'trans_no');
    const s = await this.schema(p.branch);
    const h = rows<any>(
      await this.db.raw(
        `SELECT g.*,DATE_FORMAT(g.delivery_date,'%Y-%m-%d') AS deliveryDate,s.supp_name AS supplierName,s.address AS supplierAddress,po.reference AS poReference
      FROM \`${s}\`.\`0_grn_batch\` g LEFT JOIN \`${s}\`.\`0_suppliers\` s ON s.supplier_id=g.supplier_id
      LEFT JOIN \`${s}\`.\`0_purch_orders\` po ON po.order_no=g.purch_order_no WHERE g.id=? LIMIT 1`,
        [p.transNo],
      ),
    )[0];
    if (!h)
      throw new NotFoundException('Purchase order delivery was not found.');
    const [items, voided] = await Promise.all([
      this.db.raw(
        `SELECT i.item_code AS itemCode,i.description,i.r_uom AS unit,i.qty_recd AS quantity,i.rnotes AS notes,i.extended,i.po_detail_item AS poDetailItem,d.delivery_date AS requiredDate,d.unit_price AS price
        FROM \`${s}\`.\`0_grn_items\` i LEFT JOIN \`${s}\`.\`0_purch_order_details\` d ON d.po_detail_item=i.po_detail_item WHERE i.grn_batch_id=? ORDER BY i.id`,
        [p.transNo],
      ),
      this.db.raw(
        `SELECT id FROM \`${s}\`.\`0_voided\` WHERE type=25 AND id=? LIMIT 1`,
        [p.transNo],
      ),
    ]);
    const lines = rows(items);
    return {
      transNo: p.transNo,
      reference: text(h.reference),
      supplierName: text(h.supplierName),
      supplierAddress: text(h.supplierAddress),
      purchaseOrder: text(h.poReference),
      deliveryDate: text(h.deliveryDate),
      location: text(h.loc_code),
      comments: text(h.rcomments),
      voided: rows(voided).length > 0,
      items: lines,
      totalQuantity: lines.reduce(
        (sum: number, x: any) => sum + (Number(x.quantity) || 0),
        0,
      ),
      total: lines.reduce((sum: number, x: any) => sum + amount(x.extended), 0),
    };
  }

  async supplierCredit(query: unknown) {
    const p = this.params(query, 'trans_no');
    const s = await this.schema(p.branch);
    const type = 21;
    const h = rows<any>(
      await this.db.raw(
        `SELECT st.*,DATE_FORMAT(st.tran_date,'%Y-%m-%d') AS tranDate,DATE_FORMAT(st.due_date,'%Y-%m-%d') AS dueDate,s.supp_name AS supplierName,s.curr_code AS currency
      FROM \`${s}\`.\`0_supp_trans\` st LEFT JOIN \`${s}\`.\`0_suppliers\` s ON s.supplier_id=st.supplier_id WHERE st.type=? AND st.trans_no=? LIMIT 1`,
        [type, p.transNo],
      ),
    )[0];
    if (!h) throw new NotFoundException('Supplier credit note was not found.');
    const [comments, items, taxes, allocations, gl, voided] = await Promise.all(
      [
        this.db.raw(
          `SELECT memo_ AS memo FROM \`${s}\`.\`0_comments\` WHERE type=? AND id=? ORDER BY date_`,
          [type, p.transNo],
        ),
        this.db.raw(
          `SELECT i.*,i.gl_code AS account,cm.account_name AS accountName,i.unit_price AS price,i.quantity AS quantity,i.i_uom AS unit FROM \`${s}\`.\`0_supp_invoice_items\` i LEFT JOIN \`${s}\`.\`0_chart_master\` cm ON cm.account_code=i.gl_code WHERE i.supp_trans_type=? AND i.supp_trans_no=? ORDER BY i.id`,
          [type, p.transNo],
        ),
        this.db.raw(
          `SELECT tt.name,td.rate,td.amount FROM \`${s}\`.\`0_trans_tax_details\` td LEFT JOIN \`${s}\`.\`0_tax_types\` tt ON tt.id=td.tax_type_id WHERE td.trans_type=? AND td.trans_no=? ORDER BY td.tax_type_id`,
          [type, p.transNo],
        ),
        this.db.raw(
          `SELECT a.amt AS amount,DATE_FORMAT(a.date_alloc,'%Y-%m-%d') AS date,a.trans_no_to AS transNo,a.trans_type_to AS type,st.reference,st.tran_date AS tranDate FROM \`${s}\`.\`0_supp_allocations\` a LEFT JOIN \`${s}\`.\`0_supp_trans\` st ON st.trans_no=a.trans_no_to AND st.type=a.trans_type_to WHERE (a.trans_no_from=? AND a.trans_type_from=?) OR (a.trans_no_to=? AND a.trans_type_to=?) ORDER BY a.date_alloc`,
          [p.transNo, type, p.transNo, type],
        ),
        this.glRows(s, '0_gl_trans', type, p.transNo),
        this.db.raw(
          `SELECT id FROM \`${s}\`.\`0_voided\` WHERE type=? AND id=? LIMIT 1`,
          [type, p.transNo],
        ),
      ],
    );
    return {
      transNo: p.transNo,
      transactionType: 'Supplier Credit Note',
      supplierName: text(h.supplierName),
      reference: text(h.reference),
      supplierReference: text(h.supp_reference),
      tranDate: text(h.tranDate),
      dueDate: text(h.dueDate),
      currency: text(h.currency),
      comments: rows<any>(comments).map((x) => text(x.memo)),
      items: rows(items).map((x: any) => ({
        ...x,
        amount: amount(x.unit_price) * Number(x.quantity || 0),
      })),
      taxes: rows(taxes),
      allocations: rows(allocations),
      glItems: gl,
      total: amount(-(Number(h.ov_amount || 0) + Number(h.ov_gst || 0))),
      voided: rows(voided).length > 0,
    };
  }

  async rs(query: unknown, thermal = false, movement = false) {
    const source =
      query && typeof query === 'object'
        ? (query as Record<string, unknown>)
        : {};
    const rsId = text(source.rs_id);
    if (!/^\d+$/.test(rsId))
      throw new BadRequestException(
        'A valid returned merchandise slip is required.',
      );
    const branch = Number(source.branch);
    if (!Number.isInteger(branch) || branch < 0)
      throw new BadRequestException('A valid branch is required.');
    const schema = await this.schema(branch);
    const h = rows<any>(
      await this.db.raw(
        `SELECT h.*,DATE_FORMAT(h.rs_date,'%Y-%m-%d') AS date,co.coy_name AS companyName,co.postal_address AS companyAddress,COALESCE(NULLIF(v.description,''),h.supplier_name,h.supplier_code) AS supplierName
      FROM returned_merchandise.\`0_rms_header\` h LEFT JOIN new_datacenter.vendor v ON v.vendorcode=h.supplier_code LEFT JOIN \`${schema}\`.\`0_company\` co ON 1=1 WHERE h.rs_id=? LIMIT 1`,
        [Number(rsId)],
      ),
    )[0];
    if (!h)
      throw new NotFoundException('Returned merchandise slip was not found.');
    const items = rows<any>(
      await this.db.raw(
        movement
          ? `SELECT i.item_name AS itemName,i.qty AS quantity,i.uom,i.price,ROUND(i.qty*i.price,3) AS amount FROM returned_merchandise.\`0_rms_items\` i JOIN returned_merchandise.\`0_rms_header\` h ON h.rs_id=i.rs_id WHERE h.movement_type=? AND h.movement_no=? ORDER BY i.id`
          : `SELECT item_name AS itemName,qty AS quantity,uom,price,ROUND(qty*price,3) AS amount FROM returned_merchandise.\`0_rms_items\` WHERE rs_id=? ORDER BY id`,
        movement ? [h.movement_type, h.movement_no] : [Number(rsId)],
      ),
    );
    const total = items.reduce(
      (sum: number, x: any) => sum + Number(x.amount || 0),
      0,
    );
    return {
      thermal,
      movement,
      companyName: text(h.companyName),
      companyAddress: text(h.companyAddress),
      supplierName: text(h.supplierName),
      supplierCode: text(h.supplier_code),
      movementNo: text(h.movement_no),
      movementType: text(h.movement_type),
      rsId: Number(h.rs_id),
      date: text(h.date),
      processedDate: text(h.bo_processed_date),
      action:
        Number(h.rs_action) === 2
          ? 'For Disposal From BO'
          : 'Return to Supplier',
      status: movement
        ? Number(h.trans_no) === 0
          ? 'To be processed by accounting'
          : 'Already processed by accounting'
        : Number(h.processed) === 0
          ? 'PENDING'
          : Number(h.rs_action) === 2
            ? 'Disposed'
            : 'Returned to Supplier',
      saToBo: Number(h.trans_no) || Number(h.rs_id),
      remarks: text(h.comment),
      approverRemarks: text(h.approver_comment),
      items,
      total: Math.round(total * 1000) / 1000,
      voided: false,
    };
  }

  private async glRows(
    schema: string,
    table: '0_gl_trans' | '0_gl_trans_temp',
    type: number,
    no: number,
  ) {
    return rows<any>(
      await this.db.raw(
        `SELECT gl.account,cm.account_name AS accountName,gl.amount,gl.memo_,gl.dimension_id AS dimension1Id,gl.dimension2_id AS dimension2Id,
      CONCAT_WS(' - ',d1.reference,d1.name) AS dimension1,CONCAT_WS(' - ',d2.reference,d2.name) AS dimension2,COALESCE(r.reference,'') AS reference,
      IF(gl.amount>0,gl.amount,0) AS debit,IF(gl.amount<0,-gl.amount,0) AS credit
      FROM \`${schema}\`.\`${table}\` gl LEFT JOIN \`${schema}\`.\`0_chart_master\` cm ON cm.account_code=gl.account
      LEFT JOIN \`${schema}\`.\`0_refs\` r ON r.type=gl.type AND r.id=gl.type_no LEFT JOIN \`${schema}\`.\`0_dimensions\` d1 ON d1.id=gl.dimension_id
      LEFT JOIN \`${schema}\`.\`0_dimensions\` d2 ON d2.id=gl.dimension2_id WHERE gl.type=? AND gl.type_no=? ORDER BY gl.amount DESC,gl.counter`,
        [type, no],
      ),
    );
  }

  private async allocations(s: string, type: number, no: number) {
    if (type === 1) {
      return rows<any>(
        await this.db.raw(
          `SELECT a.amt AS amount,DATE_FORMAT(a.date_alloc,'%Y-%m-%d') AS date,a.trans_no_to AS transNo,a.trans_type_to AS transType,st.reference,st.supp_reference AS supplierReference,st.tran_date AS tranDate FROM \`${s}\`.\`0_supp_allocations\` a LEFT JOIN \`${s}\`.\`0_supp_trans\` st ON st.trans_no=a.trans_no_to AND st.type=a.trans_type_to WHERE (a.trans_no_from=? AND a.trans_type_from=22) OR (a.trans_no_to=? AND a.trans_type_to=22) ORDER BY a.date_alloc`,
          [no, no],
        ),
      );
    }
    if (type === 2)
      return rows<any>(
        await this.db.raw(
          `SELECT a.amt AS amount,DATE_FORMAT(a.date_alloc,'%Y-%m-%d') AS date,a.trans_no_to AS transNo,a.trans_type_to AS transType,ct.reference,ct.tran_date AS tranDate FROM \`${s}\`.\`0_cust_allocations\` a LEFT JOIN \`${s}\`.\`0_cust_trans\` ct ON ct.trans_no=a.trans_no_to AND ct.type=a.trans_type_to WHERE (a.trans_no_from=? AND a.trans_type_from=12) OR (a.trans_no_to=? AND a.trans_type_to=12) ORDER BY a.date_alloc`,
          [no, no],
        ),
      );
    return [];
  }

  private params(query: unknown, numberKey = 'trans_no', withType = false) {
    const x =
      query && typeof query === 'object'
        ? (query as Record<string, unknown>)
        : {};
    const branch = Number(x.branch),
      transNo = Number(x[numberKey]),
      typeId = Number(x.type_id ?? 0);
    if (
      !Number.isInteger(branch) ||
      branch < 0 ||
      !Number.isInteger(transNo) ||
      transNo <= 0
    )
      throw new BadRequestException(
        'A valid branch and transaction number are required.',
      );
    if (withType && (!Number.isInteger(typeId) || typeId < 0 || typeId > 1000))
      throw new BadRequestException('A valid transaction type is required.');
    return { branch, transNo, typeId };
  }
  private async schema(branch: number) {
    const result = rows<any>(
      await this.db.raw(
        `SELECT id,config_db_key AS configDbKey,aria_db AS ariaDb FROM transfers.\`0_branches\` WHERE inactive=0 AND (config_db_key=? OR id=?)`,
        [branch, branch],
      ),
    );
    const chosen =
      result.find((x) => Number(x.configDbKey) === branch) ||
      result.find((x) => Number(x.id) === branch);
    const schema = text(chosen?.ariaDb).trim();
    if (!IDENTIFIER.test(schema))
      throw new NotFoundException('Selected branch was not found.');
    return schema;
  }
  private typeName(type: number) {
    return (
      (
        {
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
          20: 'AP Voucher',
          21: 'Supplier Credit Note',
          22: 'Supplier Payment',
          24: 'Cash Withholding',
          25: 'Purchase Order Delivery',
          52: 'Supplier Credit Memo',
          53: 'Supplier Debit Memo',
        } as Record<number, string>
      )[type] ?? `Type ${type}`
    );
  }
}
