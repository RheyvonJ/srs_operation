import { ServiceUnavailableException } from '@nestjs/common';
import type { Knex } from 'knex';
import { describe, expect, it } from 'vitest';
import { SupplierRsController } from './supplier-rs.controller.js';
import { SupplierRsService } from './supplier-rs.service.js';

const search = {
  branchCode: 'srsagora',
  rsNumber: '',
  supplierCode: '',
  from: '2026-01-01',
  to: '2026-10-28',
};

function createDb(responses: Array<{ includes: string; rows: unknown[] }>) {
  const calls: Array<{ sql: string; bindings: unknown[] }> = [];
  const db = {
    async raw(sql: string, bindings: unknown[] = []) {
      calls.push({ sql, bindings });
      const match = responses.find((response) => sql.includes(response.includes));
      return [match?.rows ?? []];
    },
    async transaction(callback: (connection: typeof db) => Promise<unknown>) {
      return callback(db);
    },
  };
  return { db: db as unknown as Knex, calls };
}

describe('SupplierRsService', () => {
  it('lists every vendor and every branch supplier', async () => {
    const { db, calls } = createDb([
      { includes: 'information_schema', rows: [{ schemaName: 'srs_aria_agora' }] },
      {
        includes: '0_suppliers',
        rows: [{ code: 'ATSPRT001', name: ' ATKINS IMPORT &amp; EXPORT RESOURCES, INC (CHICKEN)' }],
      },
    ]);
    const service = new SupplierRsService(db);

    await expect(service.suppliers()).resolves.toEqual([
      { code: 'ATSPRT001', name: 'ATKINS IMPORT & EXPORT RESOURCES, INC (CHICKEN)' },
    ]);
    const query = calls.find((call) => call.sql.includes('new_datacenter.vendor'));
    expect(query?.sql).not.toContain('GROUP_CONCAT');
    expect(query?.sql).toContain('srs_aria_agora`.`0_suppliers`');
  });
  it('requires a branch', async () => {
    const { db, calls } = createDb([]);
    const service = new SupplierRsService(db);

    await expect(service.search({ ...search, branchCode: '' })).rejects.toThrow('Please select a branch.');
    expect(calls).toHaveLength(0);
  });

  it('looks up one RS number without the date filter', async () => {
    const { db, calls } = createDb([
      { includes: '0_branches', rows: [{ id: 2, configDbKey: 8, ariaDb: 'srs_aria_agora' }] },
      {
        includes: 'movement_no = ?',
        rows: [
          {
            rsId: '44',
            movementNo: 900,
            rsDate: '2026-03-02',
            supplierName: 'Acme',
            extended: 12.3456,
          },
        ],
      },
    ]);
    const service = new SupplierRsService(db);

    await expect(service.search({ ...search, rsNumber: '900', from: 'not-a-date' })).resolves.toEqual({
      rows: [
        {
          rsId: '44',
          movementNo: 900,
          rsDate: '2026-03-02',
          supplierName: 'Acme',
          extended: 12.346,
          slip: { rsId: '44', branch: 8, database: 'srs_aria_agora' },
        },
      ],
    });

    const query = calls.find((call) => call.sql.includes('movement_no = ?'));
    expect(query?.sql).toContain('returned_merchandise.`0_rms_header`');
    expect(query?.sql).not.toContain("movement_type = 'R2SSA'");
    expect(query?.bindings).toEqual([900]);
  });

  it('filters dated slips by supplier, type 53, and R2SSA', async () => {
    const { db, calls } = createDb([
      { includes: '0_branches', rows: [{ id: 2, configDbKey: 8, ariaDb: 'srs_aria_agora' }] },
      { includes: 'R2SSA', rows: [] },
    ]);
    const service = new SupplierRsService(db);

    await expect(service.search({ ...search, supplierCode: 'V001' })).resolves.toEqual({ rows: [] });

    const query = calls.find((call) => call.sql.includes('R2SSA'));
    expect(query?.sql).toContain('rms.trans_type = 53');
    expect(query?.sql).toContain('SUM(items.qty * items.price)');
    expect(query?.sql).toContain('new_datacenter.vendor');
    expect(query?.bindings).toEqual(['2026-01-01', '2026-10-28', 'V001']);
  });
});

describe('SupplierRsController', () => {
  it('turns a database failure into a service error', async () => {
    const controller = new SupplierRsController({
      search: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    } as SupplierRsService);

    await expect(controller.search(search)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
