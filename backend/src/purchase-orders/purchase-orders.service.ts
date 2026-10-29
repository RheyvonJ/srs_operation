import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';
import { PO_KNEX, RECEIVED_KNEX } from './purchase-order-connections.js';

export interface PurchaseOrderPrint {
  branch: string;
  orderNo: string;
  reference: string;
  supplierId: string;
}

export interface PurchaseOrderLine {
  line: number;
  supplierId: string;
  supplierName: string;
  reference: string;
  orderNo: string;
  branchName: string;
  transDate: string;
  netTotal: number;
  emailStatus: 'Sent' | 'Pending';
  poStatus: string;
  print: PurchaseOrderPrint;
  receivedDates: string;
  receivedTotal: number | null;
}

export interface PurchaseOrderGroup {
  supplierId: string;
  supplierName: string;
  subtotal: number;
  rows: PurchaseOrderLine[];
}

export interface PurchaseOrderResult {
  groups: PurchaseOrderGroup[];
  grandTotal: number;
}

interface PurchaseOrderSearch {
  branchCode: string;
  from: string;
  to: string;
  tin: string;
}

interface OrderRow {
  supplierId: string | number | null;
  supplierName: string | null;
  reference: string | null;
  orderNo: string | number | null;
  branchCode: string | null;
  transDate: string | null;
  netTotal: string | number | null;
  email: string | number | null;
  status: string | number | null;
}

interface ReceiptRow {
  purchaseOrderNo: string | null;
  branch: string | null;
  dateReceived: string | null;
  totExtended: string | number | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const IDENTIFIER = /^[A-Za-z0-9_]+$/;
const ORDER_NO = /^[A-Za-z0-9_-]+$/;
const VENDOR_CODE = /^[A-Za-z0-9_.&()\- ]+$/;
const NO_ORDERS = 'Invalid TIN or No Purchase Order';
const COMPANY_NAME = 'SAN ROQUE SUPERMARKET RETAIL SYSTEMS, INC.';

export interface PurchaseOrderItem {
  barcode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  extended: number;
}

export interface PurchaseOrderDocument {
  companyName: string;
  branchAddress: string;
  branchTin: string;
  reference: string;
  transDate: string;
  validUntil: string;
  vendorName: string;
  vendorAddress: string;
  contactPerson: string;
  deliveryAddress: string;
  terms: string;
  lines: PurchaseOrderItem[];
  totalQuantity: number;
  grandTotal: number;
  remarks: string;
  preparedBy: string;
  preparedBySign: string;
  approvedBy: string;
  approvedBySign: string;
}

function asText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return [];
}

function money(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function signatureFile(value: unknown): string {
  const name = text(value).replace(/\\/g, '/').split('/').pop() ?? '';
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith('.')) return '';
  return name;
}

function lineExtended(quantity: number, unitPrice: number, discounts: unknown): number {
  let total = quantity * unitPrice;
  const raw = text(discounts);
  if (raw && raw !== '0') {
    for (const part of raw.split(',')) {
      const pieces = part.split('=>');
      if (pieces.length <= 1) continue;
      const deduction = Number(pieces[1]);
      if (Number.isFinite(deduction)) total -= deduction;
    }
  }
  return money(total);
}

function remarkText(row: Record<string, unknown> | undefined): string {
  if (!row) return '';
  for (const key of ['memo_', 'memo', 'comment', 'comments', 'remarks']) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  const third = Object.values(row)[2];
  return typeof third === 'string' ? third.trim() : '';
}

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function poStatus(value: unknown): string {
  const status = Number(value);
  if (value == null || value === '' || status === 0) return 'Approved';
  if (status === 2) return 'Cancelled';
  if (status === 3) return 'Expired';
  return '';
}

function receiptKey(reference: string, branch: string): string {
  return `${reference}\u0000${branch}`;
}

function receivedDateLabel(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) return null;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(KNEX) private readonly catalog: Knex,
    @Inject(PO_KNEX) private readonly orders: Knex,
    @Inject(RECEIVED_KNEX) private readonly received: Knex,
  ) {}

  async search(body: unknown): Promise<PurchaseOrderResult> {
    const input = this.parse(body);
    const supplierRefs = await this.supplierRefs(input.tin);
    if (supplierRefs.length === 0) throw new BadRequestException(NO_ORDERS);

    const [branchNames, records] = await Promise.all([
      this.branchNames(),
      this.orderRows(input, supplierRefs),
    ]);
    if (records.length === 0) throw new BadRequestException(NO_ORDERS);

    const receipts = await this.receipts(
      records.map((row) => ({
        reference: (row.reference ?? '').trim(),
        branchCode: (row.branchCode ?? '').trim(),
      })),
    );

    const groups: PurchaseOrderGroup[] = [];
    let grandTotal = 0;
    records.forEach((row, index) => {
      const supplierId = row.supplierId == null ? '' : String(row.supplierId);
      const supplierName = (row.supplierName ?? '').trim();
      let group = groups[groups.length - 1];
      if (!group || group.supplierId !== supplierId) {
        group = { supplierId, supplierName, subtotal: 0, rows: [] };
        groups.push(group);
      }

      const netTotal = money(row.netTotal);
      group.subtotal = money(group.subtotal + netTotal);
      grandTotal = money(grandTotal + netTotal);
      const reference = (row.reference ?? '').trim();
      const branchCode = (row.branchCode ?? '').trim();
      const orderNo = row.orderNo == null ? '' : String(row.orderNo);
      const receipt = receipts.get(receiptKey(reference, branchCode));
      group.rows.push({
        line: index + 1,
        supplierId,
        supplierName,
        reference,
        orderNo,
        branchName: branchNames.get(branchCode) || branchCode,
        transDate: row.transDate ?? '',
        netTotal,
        emailStatus: Number(row.email) === 1 ? 'Sent' : 'Pending',
        poStatus: poStatus(row.status),
        print: { branch: branchCode, orderNo, reference, supplierId },
        receivedDates: receipt?.dates || '-',
        receivedTotal: receipt ? receipt.total : null,
      });
    });

    return { groups, grandTotal };
  }

  async print(query: Record<string, unknown>): Promise<PurchaseOrderDocument> {
    const branch = asText(query.branch, 32);
    const orderNo = asText(query.order_no, 20);
    const supplierId = asText(query.supplier_id, 60);
    const reference = asText(query.ref, 40);
    if (!IDENTIFIER.test(branch)) throw new BadRequestException('Please select a branch.');
    if (!ORDER_NO.test(orderNo)) throw new BadRequestException('Purchase order was not found.');
    if (!VENDOR_CODE.test(supplierId)) throw new BadRequestException('Purchase order was not found.');

    const [branchRow, header, vendorDb] = await Promise.all([
      this.branchRecord(branch),
      this.poHeader(branch, orderNo),
      this.vendorDatabase(branch),
    ]);
    if (!header) throw new NotFoundException('Purchase order was not found.');

    const [vendor, detailRows, commentRow, prepared, approved] = await Promise.all([
      IDENTIFIER.test(vendorDb) ? this.vendorRecord(vendorDb, supplierId) : Promise.resolve(undefined),
      this.detailRows(orderNo),
      this.commentRow(orderNo),
      this.preparedBy(orderNo),
      this.approvedBy(orderNo),
    ]);

    let totalQuantity = 0;
    let grandTotal = 0;
    const lines = detailRows.map((row) => {
      const quantity = money(row.quantity);
      const unitPrice = money(row.unitPrice);
      const extended = lineExtended(Number(row.quantity) || 0, Number(row.unitPrice) || 0, row.discounts);
      totalQuantity = money(totalQuantity + (Number(row.quantity) || 0));
      grandTotal = money(grandTotal + extended);
      return {
        barcode: text(row.barcode),
        description: text(row.description),
        unit: text(row.unit),
        quantity,
        unitPrice,
        extended,
      };
    });

    return {
      companyName: COMPANY_NAME,
      branchAddress: text(branchRow?.address),
      branchTin: text(branchRow?.tin),
      reference,
      transDate: text(header.transDate),
      validUntil: text(header.deliveryDate),
      vendorName: text(vendor?.vendorName),
      vendorAddress: text(vendor?.address),
      contactPerson: text(vendor?.contactPerson),
      deliveryAddress: text(header.deliveryAddress),
      terms: text(vendor?.termDesc),
      lines,
      totalQuantity,
      grandTotal,
      remarks: remarkText(commentRow),
      preparedBy: text(prepared?.preparedBy),
      preparedBySign: signatureFile(prepared?.sign),
      approvedBy: text(approved?.approvedBy),
      approvedBySign: signatureFile(approved?.sign),
    };
  }

  private parse(body: unknown): PurchaseOrderSearch {
    const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const tin = asText(source.tin, 64);
    if (!tin) throw new BadRequestException('Please Input Your TIN#.');

    const branchCode = asText(source.branchCode, 32);
    if (branchCode && branchCode !== 'all' && !IDENTIFIER.test(branchCode)) {
      throw new BadRequestException('Please select a branch.');
    }

    const from = asText(source.from, 10);
    const to = asText(source.to, 10);
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || !isRealDate(from) || !isRealDate(to) || from > to) {
      throw new BadRequestException('Please enter a valid date range.');
    }

    return { branchCode: branchCode === 'all' ? '' : branchCode, from, to, tin };
  }

  private async supplierRefs(tin: string): Promise<string[]> {
    const result = await this.catalog.raw(
      `SELECT DISTINCT TRIM(supp_ref) AS supplierRef
       FROM srs_aria_nova.\`0_suppliers\`
       WHERE TRIM(REPLACE(gst_no, '-', '')) = TRIM(REPLACE(?, '-', ''))
         AND supp_ref IS NOT NULL
         AND TRIM(supp_ref) <> ''`,
      [tin],
    );
    return rowsOf<{ supplierRef: string | null }>(result).flatMap((row) => {
      const supplierRef = (row.supplierRef ?? '').trim();
      return supplierRef ? [supplierRef] : [];
    });
  }

  private async branchNames(): Promise<Map<string, string>> {
    const result = await this.catalog.raw(
      `SELECT code, name
       FROM transfers.\`0_branches\``,
    );
    return new Map(
      rowsOf<{ code: string | null; name: string | null }>(result).flatMap((row) => {
        const code = (row.code ?? '').trim();
        const name = (row.name ?? '').trim();
        return code ? [[code, name || code] as const] : [];
      }),
    );
  }

  private async orderRows(input: PurchaseOrderSearch, supplierRefs: string[]): Promise<OrderRow[]> {
    const placeholders = supplierRefs.map(() => '?').join(', ');
    const bindings: string[] = [input.from, input.to, ...supplierRefs];
    let branchFilter = '';
    if (input.branchCode) {
      branchFilter = 'AND p.br_code = ?';
      bindings.push(input.branchCode);
    }
    const result = await this.orders.raw(
      `SELECT
         p.supplier_id AS supplierId,
         p.supplier_name AS supplierName,
         r.reference AS reference,
         p.order_no AS orderNo,
         p.br_code AS branchCode,
         DATE_FORMAT(p.trans_date, '%Y-%m-%d') AS transDate,
         p.net_total AS netTotal,
         p.email AS email,
         p.status AS status
       FROM srs.purch_orders AS p
       LEFT JOIN srs.refs AS r
         ON p.order_no = r.trans_id AND p.trans_type = r.trans_type
       WHERE CAST(p.trans_date AS DATE) >= ?
         AND CAST(p.trans_date AS DATE) <= ?
         AND p.supplier_id IN (${placeholders})
         AND p.trans_type = 16
         ${branchFilter}
       ORDER BY p.supplier_name, p.trans_date ASC`,
      bindings,
    );
    return rowsOf<OrderRow>(result);
  }

  private async receipts(
    lines: Array<{ reference: string; branchCode: string }>,
  ): Promise<Map<string, { dates: string; total: number }>> {
    const pairs = [
      ...new Map(
        lines
          .filter((line) => line.reference && line.branchCode)
          .map((line) => [receiptKey(line.reference, line.branchCode), line] as const),
      ).values(),
    ];
    const found = new Map<string, { dates: string[]; total: number }>();
    for (let index = 0; index < pairs.length; index += 80) {
      const chunk = pairs.slice(index, index + 80);
      const where = chunk.map(() => '(PurchaseOrderNo = ? AND Branch = ?)').join(' OR ');
      const result = await this.received.raw(
        `SELECT
           PurchaseOrderNo AS purchaseOrderNo,
           Branch AS branch,
           DateReceived AS dateReceived,
           SUM(tot_extended) AS totExtended
         FROM received_po.received_purcahses
         WHERE ${where}
         GROUP BY PurchaseOrderNo, Branch, ReceivingNo, DateReceived, ReceivingID
         ORDER BY DateReceived, ReceivingNo`,
        chunk.flatMap((pair) => [pair.reference, pair.branchCode]),
      );
      for (const row of rowsOf<ReceiptRow>(result)) {
        const key = receiptKey((row.purchaseOrderNo ?? '').trim(), (row.branch ?? '').trim());
        const bucket = found.get(key) ?? { dates: [], total: 0 };
        const label = receivedDateLabel(row.dateReceived);
        if (label && !bucket.dates.includes(label)) bucket.dates.push(label);
        bucket.total += Number(row.totExtended) || 0;
        found.set(key, bucket);
      }
    }

    return new Map(
      [...found].map(([key, bucket]) => [
        key,
        { dates: bucket.dates.join(',') || '-', total: money(bucket.total) },
      ]),
    );
  }

  private async branchRecord(branch: string): Promise<{ address: string | null; tin: string | null } | undefined> {
    const result = await this.orders.raw(
      `SELECT address, tin
       FROM srs.branches
       WHERE code = ?
       LIMIT 1`,
      [branch],
    );
    return rowsOf<{ address: string | null; tin: string | null }>(result)[0];
  }

  private async vendorDatabase(branch: string): Promise<string> {
    const result = await this.catalog.raw(
      `SELECT db_56 AS vendorDb
       FROM transfers.\`0_branches\`
       WHERE code = ?
       LIMIT 1`,
      [branch],
    );
    return text(rowsOf<{ vendorDb: string | null }>(result)[0]?.vendorDb);
  }

  private async poHeader(
    branch: string,
    orderNo: string,
  ): Promise<{ transDate: string | null; deliveryDate: string | null; deliveryAddress: string | null } | undefined> {
    const result = await this.orders.raw(
      `SELECT
         DATE_FORMAT(trans_date, '%Y-%m-%d') AS transDate,
         DATE_FORMAT(delivery_date, '%Y-%m-%d') AS deliveryDate,
         delivery_address AS deliveryAddress
       FROM srs.purch_orders
       WHERE order_no = ? AND br_code = ? AND trans_type = 16
       LIMIT 1`,
      [orderNo, branch],
    );
    return rowsOf<{ transDate: string | null; deliveryDate: string | null; deliveryAddress: string | null }>(result)[0];
  }

  private async vendorRecord(schema: string, supplierId: string): Promise<{
    termDesc: string | null;
    vendorName: string | null;
    address: string | null;
    contactPerson: string | null;
  } | undefined> {
    const result = await this.orders.raw(
      `SELECT
         terms.description AS termDesc,
         vendor.description AS vendorName,
         vendor.address AS address,
         vendor.contactperson AS contactPerson
       FROM \`${schema}\`.vendor AS vendor
       LEFT JOIN \`${schema}\`.terms AS terms ON vendor.terms = terms.TermID
       WHERE vendor.vendorcode = ?
       LIMIT 1`,
      [supplierId],
    );
    return rowsOf<{
      termDesc: string | null;
      vendorName: string | null;
      address: string | null;
      contactPerson: string | null;
    }>(result)[0];
  }

  private async detailRows(orderNo: string): Promise<Array<{
    barcode: string | null;
    description: string | null;
    unit: string | null;
    quantity: number | string | null;
    unitPrice: number | string | null;
    discounts: string | null;
  }>> {
    const result = await this.orders.raw(
      `SELECT barcode, description, unit_id AS unit, ord_qty AS quantity, unit_price AS unitPrice, discounts
       FROM srs.purch_order_details
       WHERE order_no = ? AND trans_type = 16`,
      [orderNo],
    );
    return rowsOf<{
      barcode: string | null;
      description: string | null;
      unit: string | null;
      quantity: number | string | null;
      unitPrice: number | string | null;
      discounts: string | null;
    }>(result);
  }

  private async commentRow(orderNo: string): Promise<Record<string, unknown> | undefined> {
    const result = await this.orders.raw(
      `SELECT *
       FROM srs.comments
       WHERE id = ? AND trans_type = 16
       LIMIT 1`,
      [orderNo],
    );
    return rowsOf<Record<string, unknown>>(result)[0];
  }

  private async preparedBy(orderNo: string): Promise<{ preparedBy: string | null; sign: string | null } | undefined> {
    const result = await this.orders.raw(
      `SELECT CONCAT(d.fname, ' ', d.lname) AS preparedBy, d.sign AS sign
       FROM srs.purch_orders a
       INNER JOIN srs.purch_orders b ON a.trans_ref = b.order_no AND b.trans_type = 15
       INNER JOIN srs.refs c ON c.trans_id = b.order_no AND c.trans_type = 15
       INNER JOIN srs.users d ON c.user_id = d.id
       WHERE a.trans_type = 16 AND a.order_no = ?
       LIMIT 1`,
      [orderNo],
    );
    return rowsOf<{ preparedBy: string | null; sign: string | null }>(result)[0];
  }

  private async approvedBy(orderNo: string): Promise<{ approvedBy: string | null; sign: string | null } | undefined> {
    const result = await this.orders.raw(
      `SELECT CONCAT(users.fname, ' ', users.lname) AS approvedBy, users.sign AS sign
       FROM srs.refs
       INNER JOIN srs.users ON refs.user_id = users.id
       WHERE refs.trans_type = '16' AND refs.trans_id = ?
       LIMIT 1`,
      [orderNo],
    );
    return rowsOf<{ approvedBy: string | null; sign: string | null }>(result)[0];
  }
}
