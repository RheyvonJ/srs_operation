import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { Knex } from 'knex';
import { describe, expect, it } from 'vitest';
import { SupplierApvController } from './supplier-apv.controller.js';
import { SupplierApvService } from './supplier-apv.service.js';

const search = {
  branchCode: 'srsn',
  from: '2026-10-09',
  to: '2026-10-09',
  tin: '000-057-562',
  invoiceNumber: '',
  poNumber: '',
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

describe('SupplierApvService', () => {
  it('requires a supplier TIN before querying', async () => {
    const { db, calls } = createDb([]);
    const service = new SupplierApvService(db);

    await expect(service.search({ ...search, tin: '  ' })).rejects.toThrow('Please Input Your TIN#.');
    expect(calls).toHaveLength(0);
  });

  it('requires a branch code', async () => {
    const { db } = createDb([]);
    const service = new SupplierApvService(db);

    await expect(service.search({ ...search, branchCode: '' })).rejects.toThrow('Please select a branch.');
  });

  it('rejects a branch that has no accounting database', async () => {
    const { db } = createDb([{ includes: '0_branches', rows: [{ ariaDb: 'not a db' }] }]);
    const service = new SupplierApvService(db);

    await expect(service.search(search)).rejects.toThrow('Selected branch is not available.');
  });

  it('reports a missing supplier', async () => {
    const { db } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_nova' }] },
      { includes: 'gst_no', rows: [] },
    ]);
    const service = new SupplierApvService(db);

    await expect(service.search(search)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.search(search)).rejects.toThrow('Supplier Not Found.');
  });

  it('reports a supplier with no APV in the date range', async () => {
    const { db } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_nova' }] },
      { includes: 'gst_no', rows: [{ supplierId: 15 }] },
      { includes: 'cv_id = 0', rows: [] },
    ]);
    const service = new SupplierApvService(db);

    await expect(service.search(search)).rejects.toThrow('Selected Supplier no APV.');
  });

  it('reads unvouchered supplier invoices from the branch database', async () => {
    const { db, calls } = createDb([
      { includes: '0_branches', rows: [{ id: 1, configDbKey: 4, ariaDb: 'srs_aria_nova' }] },
      { includes: 'gst_no', rows: [{ supplierId: 15 }] },
      {
        includes: 'cv_id = 0',
        rows: [
          {
            transDate: '2026-10-09',
            supplierName: 'Sample Supplier',
            amount: -1250.5,
            invoiceNumber: 'INV-1',
            poNumber: 'PO-1',
            transNo: 158335,
            supplierId: 44,
          },
        ],
      },
      { includes: 'type = 24', rows: [{ poNumber: 'PO-1', transNo: 900 }] },
    ]);
    const service = new SupplierApvService(db);

    await expect(service.search({ ...search, invoiceNumber: 'INV', poNumber: 'PO' })).resolves.toEqual({
      rows: [
        {
          line: 1,
          transDate: '2026-10-09',
          supplierName: 'Sample Supplier',
          amount: 1250.5,
          invoiceNumber: 'INV-1',
          poNumber: 'PO-1',
          bir: { branch: 4, type: 24, transNo: 900, supplierId: 44 },
        },
      ],
      total: 1250.5,
    });

    const apvQuery = calls.find((call) => call.sql.includes('cv_id = 0'));
    expect(apvQuery?.sql).toContain('`srs_aria_nova`.`0_supp_trans`');
    expect(apvQuery?.sql).toContain('st.type = 20');
    expect(apvQuery?.sql).toContain('st.ov_amount + st.ov_gst - st.ov_discount - st.ewt');
    expect(apvQuery?.bindings).toEqual(['2026-10-09', '2026-10-09', 15, '%PO%', '%INV%']);
  });
});

describe('SupplierApvController', () => {
  it('turns a database failure into a service error', async () => {
    const controller = new SupplierApvController({
      search: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    } as SupplierApvService);

    await expect(controller.search(search)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
