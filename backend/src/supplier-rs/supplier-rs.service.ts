import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';

export interface RsSlipTarget {
  rsId: string;
  branch: number;
  database: string;
}

export interface SupplierRsLine {
  rsId: string;
  movementNo: number;
  rsDate: string;
  supplierName: string;
  extended: number;
  slip: RsSlipTarget | null;
}

export interface SupplierRsResult {
  rows: SupplierRsLine[];
}

export interface SupplierOption {
  code: string;
  name: string;
}

interface SupplierRsSearch {
  branchCode: string;
  rsNumber: string;
  supplierCode: string;
  from: string;
  to: string;
}

interface RsRow {
  rsId: number | string | null;
  movementNo: number | string | null;
  rsDate: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  extended: number | string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const IDENTIFIER = /^[A-Za-z0-9_]+$/;
const RS_NUMBER = /^\d+$/;

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

function money3(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 1000) / 1000;
}

function sqlName(column: string): string {
  return `TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${column}, '&amp;', '&'), '&quot;', '"'), '&#039;', CHAR(39)), '&lt;', '<'), '&gt;', '>'))`;
}

function supplierLabel(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
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
export class SupplierRsService {
  private supplierCache: { at: number; rows: SupplierOption[] } | null = null;

  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async suppliers(): Promise<SupplierOption[]> {
    if (this.supplierCache && Date.now() - this.supplierCache.at < 5 * 60 * 1000) {
      return this.supplierCache.rows;
    }
    const schemas = await this.supplierSchemas();
    const branchSuppliers = schemas
      .map((schema) => `SELECT CASE WHEN TRIM(supp_ref) = '' THEN ${sqlName('supp_name')} ELSE TRIM(supp_ref) END AS code, ${sqlName('supp_name')} AS name FROM \`${schema}\`.\`0_suppliers\` WHERE supp_name IS NOT NULL AND TRIM(supp_name) <> ''`)
      .join(' UNION ');
    const result = await this.db.raw(
      `SELECT code, name
       FROM (
         SELECT TRIM(vendorcode) AS code, ${sqlName('description')} AS name
         FROM new_datacenter.vendor
         WHERE vendorcode IS NOT NULL AND TRIM(vendorcode) <> ''
         ${branchSuppliers ? `UNION ${branchSuppliers}` : ''}
       ) suppliers
       WHERE NULLIF(code, '') IS NOT NULL AND NULLIF(name, '') IS NOT NULL
       ORDER BY name`,
    );
    const rows = rowsOf<{ code: string | null; name: string | null }>(result).flatMap((row) => {
      const code = (row.code ?? '').trim();
      const name = supplierLabel(row.name ?? '');
      if (!code || !name) return [];
      return [{ code, name }];
    });
    this.supplierCache = { at: Date.now(), rows };
    return rows;
  }

  async search(body: unknown): Promise<SupplierRsResult> {
    const input = this.parse(body);
    const branch = await this.branchConnection(input.branchCode);
    const [records, names] = await Promise.all([
      input.rsNumber ? this.rowsByNumber(input.rsNumber) : this.rowsByDate(input),
      this.supplierNames(),
    ]);

    return {
      rows: records.flatMap((row) => {
        const rsId = row.rsId == null ? '' : String(row.rsId);
        const movementNo = Number(row.movementNo);
        if (!rsId || !Number.isInteger(movementNo)) return [];
        const supplierCode = (row.supplierCode ?? '').trim();
        return [
          {
            rsId,
            movementNo,
            rsDate: row.rsDate ?? '',
            supplierName: names.get(supplierCode) || (row.supplierName ?? '').trim() || supplierCode,
            extended: money3(row.extended),
            slip:
              branch.branch === null
                ? null
                : { rsId, branch: branch.branch, database: branch.schema },
          },
        ];
      }),
    };
  }

  private async supplierNames(): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    for (const supplier of await this.suppliers()) {
      const current = names.get(supplier.code);
      if (!current || supplier.name.length > current.length) names.set(supplier.code, supplier.name);
    }
    return names;
  }

  private parse(body: unknown): SupplierRsSearch {
    const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const branchCode = asText(source.branchCode, 32);
    if (!IDENTIFIER.test(branchCode)) {
      throw new BadRequestException('Please select a branch.');
    }

    const rsNumber = asText(source.rsNumber, 20);
    if (rsNumber && !RS_NUMBER.test(rsNumber)) {
      throw new BadRequestException('Please enter a valid RS#.');
    }

    const from = asText(source.from, 10);
    const to = asText(source.to, 10);
    if (!rsNumber) {
      if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || !isRealDate(from) || !isRealDate(to) || from > to) {
        throw new BadRequestException('Please enter a valid date range.');
      }
    }

    return {
      branchCode,
      rsNumber,
      supplierCode: asText(source.supplierCode, 60),
      from,
      to,
    };
  }

  private async supplierSchemas(): Promise<string[]> {
    const result = await this.db.raw(
      `SELECT TABLE_SCHEMA AS schemaName
       FROM information_schema.COLUMNS
       WHERE TABLE_NAME = '0_suppliers'
         AND COLUMN_NAME IN ('supp_ref', 'supp_name')
       GROUP BY TABLE_SCHEMA
       HAVING COUNT(DISTINCT COLUMN_NAME) = 2`,
    );
    return rowsOf<{ schemaName: string | null }>(result)
      .map((row) => (row.schemaName ?? '').trim())
      .filter((schema) => IDENTIFIER.test(schema));
  }

  private async branchConnection(branchCode: string): Promise<{ schema: string; branch: number | null }> {
    const result = await this.db.raw(
      `SELECT id, config_db_key AS configDbKey, aria_db AS ariaDb
       FROM transfers.\`0_branches\`
       WHERE code = ? AND inactive = 0
       LIMIT 1`,
      [branchCode],
    );
    const row = rowsOf<{ id: number | string | null; configDbKey: number | string | null; ariaDb: string | null }>(
      result,
    )[0];
    const schema = row?.ariaDb?.trim() ?? '';
    if (!IDENTIFIER.test(schema)) {
      throw new BadRequestException('Selected branch is not available.');
    }
    return { schema, branch: printBranchNumber(row?.configDbKey, row?.id) };
  }

  private async rowsByNumber(rsNumber: string): Promise<RsRow[]> {
    const result = await this.db.raw(
      `${this.selectSql()}
       WHERE rms.movement_no = ?
       GROUP BY rms.rs_id, rms.movement_no, rms.rs_date, rms.supplier_code
       ORDER BY rms.rs_id`,
      [Number(rsNumber)],
    );
    return rowsOf<RsRow>(result);
  }

  private async rowsByDate(input: SupplierRsSearch): Promise<RsRow[]> {
    const bindings: Array<string | number> = [input.from, input.to];
    let supplierFilter = '';
    if (input.supplierCode) {
      supplierFilter = 'AND rms.supplier_code = ?';
      bindings.push(input.supplierCode);
    }
    const result = await this.db.raw(
      `${this.selectSql()}
       WHERE rms.rs_date >= ? AND rms.rs_date <= ?
         ${supplierFilter}
         AND rms.trans_type = 53
         AND rms.movement_type = 'R2SSA'
       GROUP BY rms.rs_id, rms.movement_no, rms.rs_date, rms.supplier_code
       ORDER BY rms.rs_id`,
      bindings,
    );
    return rowsOf<RsRow>(result);
  }

  private selectSql(): string {
    return `SELECT
         CAST(rms.rs_id AS CHAR) AS rsId,
         rms.movement_no AS movementNo,
         DATE_FORMAT(rms.rs_date, '%Y-%m-%d') AS rsDate,
         rms.supplier_code AS supplierCode,
         COALESCE(
           NULLIF(TRIM(MIN(v.description)), ''),
           NULLIF(TRIM(MIN(rms.supplier_name)), ''),
           rms.supplier_code,
           ''
         ) AS supplierName,
         COALESCE(SUM(items.qty * items.price), 0) AS extended
       FROM returned_merchandise.\`0_rms_header\` rms
       LEFT JOIN returned_merchandise.\`0_rms_items\` items ON items.rs_id = rms.rs_id
       LEFT JOIN new_datacenter.vendor v ON v.vendorcode = rms.supplier_code`;
  }
}
