import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { Knex } from 'knex';
import { describe, expect, it } from 'vitest';
import { SupplierCvController } from './supplier-cv.controller.js';
import { SupplierCvService } from './supplier-cv.service.js';

const search = {
  branchCode: 'srsn',
  from: '2026-10-09',
  to: '2026-10-09',
  tin: '000-057-562',
  invoiceNumber: '',
  poNumber: '',
  cvNumber: '',
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

describe('SupplierCvService', () => {
  it('requires a supplier TIN before querying', async () => {
    const { db, calls } = createDb([]);
    const service = new SupplierCvService(db);

    await expect(service.search({ ...search, tin: '  ' })).rejects.toThrow(
      'Please Input Your TIN#.',
    );
    expect(calls).toHaveLength(0);
  });

  it('requires a branch code', async () => {
    const { db } = createDb([]);
    const service = new SupplierCvService(db);

    await expect(service.search({ ...search, branchCode: '' })).rejects.toThrow(
      'Please select a branch.',
    );
  });

  it('rejects a branch that has no accounting database', async () => {
    const { db, calls } = createDb([{ includes: '0_branches', rows: [{ ariaDb: 'not a db' }] }]);
    const service = new SupplierCvService(db);

    await expect(service.search(search)).rejects.toThrow('Selected branch is not available.');
    expect(calls).toHaveLength(1);
  });

  it('reports a missing supplier', async () => {
    const { db } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_nova' }] },
      { includes: 'gst_no', rows: [] },
    ]);
    const service = new SupplierCvService(db);

    await expect(service.search(search)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.search(search)).rejects.toThrow('Supplier Not Found.');
  });

  it('reports a supplier with no CV in the date range', async () => {
    const { db } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_nova' }] },
      { includes: 'gst_no', rows: [{ supplierId: 15 }] },
      { includes: '0_cv_header', rows: [] },
    ]);
    const service = new SupplierCvService(db);

    await expect(service.search(search)).rejects.toThrow('Selected Supplier has no CV.');
  });

  it('reads CV rows from the branch accounting database', async () => {
    const { db, calls } = createDb([
      { includes: '0_branches', rows: [{ id: 1, configDbKey: 4, ariaDb: 'srs_aria_nova' }] },
      { includes: 'gst_no', rows: [{ supplierId: 15 }] },
      {
        includes: '0_cv_header',
        rows: [
          {
            cvDate: '2026-10-09',
            supplierName: 'Sample Supplier',
            reference: '1634440',
            amount: 6808.54,
            invoiceNumber: 'INV-1',
            poNumber: 'PO-1',
            cvNumber: '1634440',
            csvDate: null,
            dueDate: '2026-10-14',
            transNo: 158335,
            supplierId: 44,
          },
        ],
      },
      { includes: 'type = 24', rows: [{ poNumber: 'PO-1', transNo: 900 }] },
    ]);
    const service = new SupplierCvService(db);

    await expect(service.search({ ...search, cvNumber: '1634' })).resolves.toEqual({
      rows: [
        {
          line: 1,
          cvDate: '2026-10-09',
          supplierName: 'Sample Supplier',
          reference: '1634440',
          amount: 6808.54,
          invoiceNumber: 'INV-1',
          poNumber: 'PO-1',
          cvNumber: '1634440',
          csvDate: '',
          dueDate: '2026-10-14',
          bir: { branch: 4, type: 24, transNo: 900, supplierId: 44 },
        },
      ],
      total: 6808.54,
    });

    const cvQuery = calls.find((call) => call.sql.includes('0_cv_header'));
    expect(cvQuery?.sql).toContain('`srs_aria_nova`.`0_cv_header`');
    expect(cvQuery?.sql).toContain("st.type = '20'");
    expect(cvQuery?.sql).toContain('cv.amount > 0');
    expect(cvQuery?.bindings).toEqual(['2026-10-09', '2026-10-09', 15, '%1634%']);
  });
});

describe('SupplierCvController', () => {
  it('turns a database failure into a service error', async () => {
    const controller = new SupplierCvController({
      search: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    } as SupplierCvService);

    await expect(controller.search(search)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
