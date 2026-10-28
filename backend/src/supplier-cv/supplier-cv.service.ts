import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';

export interface Bir2307Target {
  branch: number;
  type: 20 | 24;
  transNo: number;
  supplierId: number;
}

export interface SupplierCvLine {
  line: number;
  cvDate: string;
  supplierName: string;
  reference: string;
  amount: number;
  invoiceNumber: string;
  poNumber: string;
  cvNumber: string;
  csvDate: string;
  dueDate: string;
  bir: Bir2307Target | null;
}

export interface SupplierCvResult {
  rows: SupplierCvLine[];
  total: number;
}

interface SupplierCvSearch {
  branchCode: string;
  from: string;
  to: string;
  tin: string;
  invoiceNumber: string;
  poNumber: string;
  cvNumber: string;
}

interface CvRow {
  cvDate: string | null;
  supplierName: string | null;
  reference: string | null;
  amount: number | string | null;
  invoiceNumber: string | null;
  poNumber: string | null;
  cvNumber: string | null;
  csvDate: string | null;
  dueDate: string | null;
  transNo: number | string | null;
  supplierId: number | string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const IDENTIFIER = /^[A-Za-z0-9_]+$/;

function asText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function printBranchNumber(configDbKey: unknown, id: unknown): number | null {
  const connection = Number(configDbKey);
  if (Number.isInteger(connection) && connection >= 0) return connection;
  const branchId = Number(id);
  return Number.isInteger(branchId) && branchId >= 0 ? branchId : null;
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return [];
}

function money(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(Math.abs(amount) * 100) / 100;
}

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

@Injectable()
export class SupplierCvService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async search(body: unknown): Promise<SupplierCvResult> {
    const input = this.parse(body);
    const connection = await this.branchConnection(input.branchCode);
    const schema = connection.schema;
    const supplierIds = await this.supplierIds(schema, input.tin);
    if (supplierIds.length === 0) {
      throw new BadRequestException('Supplier Not Found.');
    }

    const records = await this.cvRows(schema, input, supplierIds);
    if (records.length === 0) {
      throw new BadRequestException('Selected Supplier has no CV.');
    }

    const cwoByPo = await this.cwoTransNumbers(
      schema,
      records.map((row) => (row.poNumber ?? '').trim()),
    );
    const rows = records.map((row, index) => {
      const poNumber = (row.poNumber ?? '').trim();
      const cwoTransNo = poNumber ? cwoByPo.get(poNumber) : undefined;
      const transNo = cwoTransNo ?? Number(row.transNo);
      const supplierId = Number(row.supplierId);
      const type: 20 | 24 = cwoTransNo ? 24 : 20;
      return {
        line: index + 1,
        cvDate: row.cvDate ?? '',
        supplierName: row.supplierName ?? '',
        reference: row.reference ?? '',
        amount: money(row.amount),
        invoiceNumber: row.invoiceNumber ?? '',
        poNumber,
        cvNumber: row.cvNumber ?? '',
        csvDate: row.csvDate ?? '',
        dueDate: row.dueDate ?? '',
        bir:
          Number.isInteger(transNo) &&
          transNo > 0 &&
          Number.isInteger(supplierId) &&
          supplierId > 0
            ? connection.branch === null
              ? null
              : { branch: connection.branch, type, transNo, supplierId }
            : null,
      };
    });
    const total = Math.round(rows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
    return { rows, total };
  }

  private parse(body: unknown): SupplierCvSearch {
    const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const tin = asText(source.tin, 32);
    if (!tin) throw new BadRequestException('Please Input Your TIN#.');

    const branchCode = asText(source.branchCode, 32);
    if (!IDENTIFIER.test(branchCode)) {
      throw new BadRequestException('Please select a branch.');
    }

    const from = asText(source.from, 10);
    const to = asText(source.to, 10);
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || !isRealDate(from) || !isRealDate(to)) {
      throw new BadRequestException('Please enter a valid date range.');
    }

    return {
      branchCode,
      from,
      to,
      tin,
      invoiceNumber: asText(source.invoiceNumber, 60),
      poNumber: asText(source.poNumber, 60),
      cvNumber: asText(source.cvNumber, 60),
    };
  }

  private async cwoTransNumbers(schema: string, poNumbers: string[]): Promise<Map<string, number>> {
    const unique = [...new Set(poNumbers.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const result = await this.db.raw(
      `SELECT special_reference AS poNumber, MIN(trans_no) AS transNo
       FROM \`${schema}\`.\`0_supp_trans\`
       WHERE type = 24 AND special_reference IN (${unique.map(() => '?').join(', ')})
       GROUP BY special_reference`,
      unique,
    );
    return new Map(
      rowsOf<{ poNumber: string | null; transNo: number | string | null }>(result).flatMap((row) => {
        const poNumber = (row.poNumber ?? '').trim();
        const transNo = Number(row.transNo);
        return poNumber && Number.isInteger(transNo) && transNo > 0 ? [[poNumber, transNo] as const] : [];
      }),
    );
  }

  private async branchConnection(branchCode: string): Promise<{ schema: string; branch: number | null }> {
    const result = await this.db.raw(
      `SELECT id, config_db_key AS configDbKey, aria_db AS ariaDb
       FROM transfers.\`0_branches\`
       WHERE code = ? AND inactive = 0
       LIMIT 1`,
      [branchCode],
    );
    const row = rowsOf<{ id: number | string | null; configDbKey: number | string | null; ariaDb: string | null }>(result)[0];
    const schema = row?.ariaDb?.trim() ?? '';
    if (!IDENTIFIER.test(schema)) {
      throw new BadRequestException('Selected branch is not available.');
    }
    return { schema, branch: printBranchNumber(row?.configDbKey, row?.id) };
  }

  private async supplierIds(schema: string, tin: string): Promise<number[]> {
    const result = await this.db.raw(
      `SELECT supplier_id AS supplierId
       FROM \`${schema}\`.\`0_suppliers\`
       WHERE TRIM(REPLACE(gst_no, '-', '')) = TRIM(REPLACE(?, '-', ''))`,
      [tin],
    );
    return rowsOf<{ supplierId: number | string }>(result)
      .map((row) => Number(row.supplierId))
      .filter((supplierId) => Number.isInteger(supplierId));
  }

  private async cvRows(
    schema: string,
    input: SupplierCvSearch,
    supplierIds: number[],
  ): Promise<CvRow[]> {
    const filters: string[] = [];
    const bindings: Array<string | number> = [input.from, input.to, ...supplierIds];
    if (input.cvNumber) {
      filters.push('AND cv.cv_no LIKE ?');
      bindings.push(`%${input.cvNumber}%`);
    }
    if (input.poNumber) {
      filters.push('AND st.special_reference LIKE ?');
      bindings.push(`%${input.poNumber}%`);
    }
    if (input.invoiceNumber) {
      filters.push('AND st.supp_reference LIKE ?');
      bindings.push(`%${input.invoiceNumber}%`);
    }

    const supplierPlaceholders = supplierIds.map(() => '?').join(', ');
    const result = await this.db.raw(
      `SELECT
         DATE_FORMAT(cv.cv_date, '%Y-%m-%d') AS cvDate,
         s.supp_name AS supplierName,
         cv.cv_no AS reference,
         ABS(cv.amount) AS amount,
         st.supp_reference AS invoiceNumber,
         st.special_reference AS poNumber,
         cv.cv_no AS cvNumber,
         DATE_FORMAT(csv.csv_date, '%Y-%m-%d %H:%i:%s') AS csvDate,
         DATE_FORMAT(cv.due_date, '%Y-%m-%d') AS dueDate,
         st.trans_no AS transNo,
         CAST(cv.person_id AS UNSIGNED) AS supplierId
       FROM \`${schema}\`.\`0_cv_header\` cv
       LEFT JOIN \`${schema}\`.\`0_supp_trans\` st ON cv.id = st.cv_id
       LEFT JOIN (
         SELECT b.cv_id, a.\`date\` AS csv_date
         FROM \`${schema}\`.\`0_csv\` a
         LEFT JOIN \`${schema}\`.\`0_csv_details\` b ON a.id = b.csv_id
       ) csv ON cv.id = csv.cv_id
       LEFT JOIN \`${schema}\`.\`0_suppliers\` s ON s.supplier_id = cv.person_id
       WHERE cv.cv_date >= ? AND cv.cv_date <= ?
         AND cv.person_id IN (${supplierPlaceholders})
         AND cv.amount > 0
         AND st.type = '20'
         ${filters.join('\n')}
       ORDER BY cv.person_id, cv.cv_date, csv.csv_date`,
      bindings,
    );
    return rowsOf<CvRow>(result);
  }
}
