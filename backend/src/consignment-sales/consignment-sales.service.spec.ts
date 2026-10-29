import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { Knex } from 'knex';
import { describe, expect, it } from 'vitest';
import { ConsignmentSalesController } from './consignment-sales.controller.js';
import { ConsignmentSalesService } from './consignment-sales.service.js';

const search = {
  branchCode: 'srsagora',
  status: 'all',
  month: 10,
  year: 2026,
  tin: '123-456-789-000',
};

function createDb(responses: Array<{ includes: string; rows: unknown[] }>) {
  const calls: Array<{ sql: string; bindings: unknown[] }> = [];
  const db = {
    async raw(sql: string, bindings: unknown[] = []) {
      calls.push({ sql, bindings });
      const match = responses.find((response) => sql.includes(response.includes));
      return [match?.rows ?? []];
    },
  };
  return { db: db as unknown as Knex, calls };
}

describe('ConsignmentSalesService', () => {
  it('requires a supplier TIN before querying', async () => {
    const { db, calls } = createDb([]);
    const service = new ConsignmentSalesService(db);

    await expect(service.search({ ...search, tin: '  ' })).rejects.toThrow('Please Input Your TIN#.');
    expect(calls).toHaveLength(0);
  });

  it('requires a branch and a real month', async () => {
    const { db, calls } = createDb([]);
    const service = new ConsignmentSalesService(db);

    await expect(service.search({ ...search, branchCode: '' })).rejects.toThrow('Please select a branch.');
    await expect(service.search({ ...search, month: 13 })).rejects.toThrow('Please select a valid month and year.');
    await expect(service.search({ ...search, status: 'closed' })).rejects.toThrow('Please select a status.');
    expect(calls).toHaveLength(0);
  });

  it('rejects a branch that has no accounting database', async () => {
    const { db } = createDb([{ includes: '0_branches', rows: [{ ariaDb: 'not a db' }] }]);
    const service = new ConsignmentSalesService(db);

    await expect(service.search(search)).rejects.toThrow('Selected branch is not available.');
  });

  it('returns an empty month when the TIN has no consignor', async () => {
    const { db, calls } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_agora' }] },
      { includes: 'payment_terms', rows: [] },
    ]);
    const service = new ConsignmentSalesService(db);

    await expect(service.search(search)).resolves.toEqual({
      rows: [],
      totals: { quantity: 0, costOfSales: 0, sales: 0 },
    });
    expect(calls.some((call) => call.sql.includes('cons_sales_header'))).toBe(false);
  });

  it('lists the month and subtracts commission from sales', async () => {
    const { db, calls } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_agora' }] },
      { includes: 'payment_terms', rows: [{ supplierRef: 'CONS001' }] },
      {
        includes: 'cons_sales_header',
        rows: [
          {
            consignmentId: 44,
            supplierName: 'Acme Consignor',
            commissionPercent: 10,
            quantity: 4.5,
            sales: 1120,
          },
          {
            consignmentId: 45,
            supplierName: 'Beta Consignor',
            commissionPercent: '0',
            quantity: 2,
            sales: '100.129',
          },
        ],
      },
    ]);
    const service = new ConsignmentSalesService(db);

    await expect(service.search({ ...search, status: 'with-cv', month: '10' })).resolves.toEqual({
      rows: [
        {
          line: 1,
          reference: 'CS44',
          period: 'October- 2026',
          description: 'Acme Consignor',
          commissionPercent: 10,
          quantity: 4.5,
          costOfSales: 1008,
          sales: 1120,
          print: { database: 'srs_aria_agora', consignmentId: 44 },
        },
        {
          line: 2,
          reference: 'CS45',
          period: 'October- 2026',
          description: 'Beta Consignor',
          commissionPercent: 0,
          quantity: 2,
          costOfSales: 100.13,
          sales: 100.13,
          print: { database: 'srs_aria_agora', consignmentId: 45 },
        },
      ],
      totals: { quantity: 6.5, costOfSales: 1108.13, sales: 1220.13 },
    });

    const salesQuery = calls.find((call) => call.sql.includes('cons_sales_header'));
    expect(salesQuery?.sql).toContain('`srs_aria_agora`.`0_cons_sales_header`');
    expect(salesQuery?.sql).toContain('AND cs.cv_id <> 0');
    expect(salesQuery?.sql).not.toContain(search.tin);
    expect(salesQuery?.bindings).toEqual(['2026-10-01', '2026-10-31', 'CONS001']);
    const supplierQuery = calls.find((call) => call.sql.includes('payment_terms'));
    expect(supplierQuery?.sql).toContain('payment_terms = 5');
  });

  it('filters consignments that have no CV', async () => {
    const { db, calls } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_nova' }] },
      { includes: 'payment_terms', rows: [{ supplierRef: 'CONS002' }] },
      { includes: 'cons_sales_header', rows: [] },
    ]);
    const service = new ConsignmentSalesService(db);

    await expect(service.search({ ...search, status: 'without-cv', month: 2, year: 2024 })).resolves.toEqual({
      rows: [],
      totals: { quantity: 0, costOfSales: 0, sales: 0 },
    });
    const salesQuery = calls.find((call) => call.sql.includes('cons_sales_header'));
    expect(salesQuery?.sql).toContain('AND cs.cv_id = 0');
    expect(salesQuery?.bindings).toEqual(['2024-02-01', '2024-02-29', 'CONS002']);
  });
});

describe('ConsignmentSalesController', () => {
  it('turns a database failure into a service error', async () => {
    const controller = new ConsignmentSalesController({
      search: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    } as ConsignmentSalesService);

    await expect(controller.search(search)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('keeps a validation error', async () => {
    const controller = new ConsignmentSalesController({
      search: async () => {
        throw new BadRequestException('Please Input Your TIN#.');
      },
    } as ConsignmentSalesService);

    await expect(controller.search(search)).rejects.toBeInstanceOf(BadRequestException);
  });
});
