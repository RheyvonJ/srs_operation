import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';

export interface ConsignmentPrint {
  database: string;
  consignmentId: number;
}

export interface ConsignmentLine {
  line: number;
  reference: string;
  period: string;
  description: string;
  commissionPercent: number;
  quantity: number;
  costOfSales: number;
  sales: number;
  print: ConsignmentPrint;
}

export interface ConsignmentTotals {
  quantity: number;
  costOfSales: number;
  sales: number;
}

export interface ConsignmentSalesResult {
  rows: ConsignmentLine[];
  totals: ConsignmentTotals;
}

interface ConsignmentSearch {
  branchCode: string;
  status: 'all' | 'with-cv' | 'without-cv';
  month: number;
  year: number;
  tin: string;
}

interface SalesRow {
  consignmentId: number | string | null;
  supplierName: string | null;
  commissionPercent: number | string | null;
  quantity: number | string | null;
  sales: number | string | null;
}

const IDENTIFIER = /^[A-Za-z0-9_]+$/;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function asText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return [];
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function amount(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

@Injectable()
export class ConsignmentSalesService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async search(body: unknown): Promise<ConsignmentSalesResult> {
    const input = this.parse(body);
    const schema = await this.branchSchema(input.branchCode);
    const supplierRefs = await this.supplierRefs(schema, input.tin);
    if (supplierRefs.length === 0) {
      return { rows: [], totals: { quantity: 0, costOfSales: 0, sales: 0 } };
    }

    const records = await this.salesRows(schema, input, supplierRefs);
    const period = `${MONTHS[input.month - 1]}- ${input.year}`;
    const totals = { quantity: 0, costOfSales: 0, sales: 0 };
    const rows: ConsignmentLine[] = [];
    for (const row of records) {
      const consignmentId = Number(row.consignmentId);
      if (!Number.isInteger(consignmentId) || consignmentId <= 0) continue;
      const sales = round2(amount(row.sales));
      const commissionPercent = round2(amount(row.commissionPercent));
      const quantity = round2(amount(row.quantity));
      const costOfSales = round2(sales - sales * (commissionPercent / 100));
      totals.quantity = round2(totals.quantity + quantity);
      totals.costOfSales = round2(totals.costOfSales + costOfSales);
      totals.sales = round2(totals.sales + sales);
      rows.push({
        line: rows.length + 1,
        reference: `CS${consignmentId}`,
        period,
        description: (row.supplierName ?? '').trim(),
        commissionPercent,
        quantity,
        costOfSales,
        sales,
        print: { database: schema, consignmentId },
      });
    }

    return { rows, totals };
  }

  private parse(body: unknown): ConsignmentSearch {
    const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const tin = asText(source.tin, 64);
    if (!tin) throw new BadRequestException('Please Input Your TIN#.');

    const branchCode = asText(source.branchCode, 32);
    if (!IDENTIFIER.test(branchCode)) {
      throw new BadRequestException('Please select a branch.');
    }

    const statusText = asText(source.status, 16) || 'all';
    if (statusText !== 'all' && statusText !== 'with-cv' && statusText !== 'without-cv') {
      throw new BadRequestException('Please select a status.');
    }

    const month = this.month(source.month);
    const year = this.year(source.year);
    if (month === null || year === null) {
      throw new BadRequestException('Please select a valid month and year.');
    }

    return { branchCode, status: statusText, month, year, tin };
  }

  private month(value: unknown): number | null {
    const text = typeof value === 'number' ? String(value) : asText(value, 2);
    if (!/^\d{1,2}$/.test(text)) return null;
    const month = Number(text);
    return month >= 1 && month <= 12 ? month : null;
  }

  private year(value: unknown): number | null {
    const text = typeof value === 'number' ? String(value) : asText(value, 4);
    if (!/^\d{4}$/.test(text)) return null;
    const year = Number(text);
    return year >= 1990 && year <= 2100 ? year : null;
  }

  private async branchSchema(branchCode: string): Promise<string> {
    const result = await this.db.raw(
      `SELECT aria_db AS ariaDb
       FROM transfers.\`0_branches\`
       WHERE code = ? AND inactive = 0
       LIMIT 1`,
      [branchCode],
    );
    const schema = rowsOf<{ ariaDb: string | null }>(result)[0]?.ariaDb?.trim() ?? '';
    if (!IDENTIFIER.test(schema)) {
      throw new BadRequestException('Selected branch is not available.');
    }
    return schema;
  }

  private async supplierRefs(schema: string, tin: string): Promise<string[]> {
    const result = await this.db.raw(
      `SELECT DISTINCT TRIM(supp_ref) AS supplierRef
       FROM \`${schema}\`.\`0_suppliers\`
       WHERE TRIM(REPLACE(gst_no, '-', '')) = TRIM(REPLACE(?, '-', ''))
         AND payment_terms = 5
         AND supp_ref IS NOT NULL
         AND TRIM(supp_ref) <> ''`,
      [tin],
    );
    return rowsOf<{ supplierRef: string | null }>(result).flatMap((row) => {
      const supplierRef = (row.supplierRef ?? '').trim();
      return supplierRef ? [supplierRef] : [];
    });
  }

  private async salesRows(schema: string, input: ConsignmentSearch, supplierRefs: string[]): Promise<SalesRow[]> {
    const range = this.monthRange(input.year, input.month);
    const statusFilter =
      input.status === 'with-cv' ? 'AND cs.cv_id <> 0' : input.status === 'without-cv' ? 'AND cs.cv_id = 0' : '';
    const result = await this.db.raw(
      `SELECT
         cs.cons_sales_id AS consignmentId,
         cs.supp_name AS supplierName,
         cs.t_commission AS commissionPercent,
         cs.t_qty AS quantity,
         cs.t_sales AS sales
       FROM \`${schema}\`.\`0_cons_sales_header\` cs
       WHERE cs.start_date = ?
         AND cs.end_date = ?
         AND cs.supp_code IN (${supplierRefs.map(() => '?').join(', ')})
         ${statusFilter}
       ORDER BY cs.supp_name`,
      [range.start, range.end, ...supplierRefs],
    );
    return rowsOf<SalesRow>(result);
  }

  private monthRange(year: number, month: number): { start: string; end: string } {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const paddedMonth = String(month).padStart(2, '0');
    return {
      start: `${year}-${paddedMonth}-01`,
      end: `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`,
    };
  }
}
