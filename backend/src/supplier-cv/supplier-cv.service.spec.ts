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
            cvId: 88001,
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
          cvId: 88001,
          branch: 4,
          bir: { branch: 4, type: 24, transNo: 900, supplierId: 44 },
        },
      ],
      total: 6808.54,
    });

    const cvQuery = calls.find((call) => call.sql.includes('0_cv_header'));
    expect(cvQuery?.sql).toContain('`srs_aria_nova`.`0_cv_header`');
    expect(cvQuery?.sql).toContain('cv.id AS cvId');
    expect(cvQuery?.sql).toContain("st.type = '20'");
    expect(cvQuery?.sql).toContain('cv.amount > 0');
    expect(cvQuery?.bindings).toEqual(['2026-10-09', '2026-10-09', 15, '%1634%']);
  });
});

describe('viewCheckVoucher', () => {
  it('builds the check voucher from the header, memo, and detail lines', async () => {
    const { db, calls } = createDb([
      {
        includes: '0_branches',
        rows: [
          { id: 4, configDbKey: 0, ariaDb: 'srs_aria_tondo' },
          { id: 1, configDbKey: 4, ariaDb: 'srs_aria_nova' },
        ],
      },
      {
        includes: '0_cv_header',
        rows: [
          {
            cvNo: '1634354',
            cvDate: '2026-10-09',
            supplierName: 'Sample Supplier',
            amount: 2175.22,
            ewt: 61.51,
          },
        ],
      },
      {
        includes: '0_cv_details',
        rows: [
          {
            transType: 20,
            transNo: 158335,
            amount: 6827.32,
            tranDate: '2026-10-09',
            reference: '200197',
            suppReference: '45281',
            ewt: 61.51,
          },
          {
            transType: 53,
            transNo: 229582,
            amount: -1503.68,
            tranDate: '2026-10-07',
            reference: '227005',
            suppReference: 'RS#214868',
            ewt: 0,
          },
          {
            transType: 22,
            transNo: 900,
            amount: 100,
            tranDate: '2026-10-09',
            reference: 'CHK-1',
            suppReference: '',
            ewt: 0,
          },
        ],
      },
      { includes: '0_comments', rows: [{ memo: 'Administrator' }] },
    ]);
    const service = new SupplierCvService(db);

    await expect(service.viewCheckVoucher({ branch: '4', trans_no: '158060' })).resolves.toEqual({
      cvNo: '1634354',
      cvDate: '2026-10-09',
      supplierName: 'Sample Supplier',
      amount: 2175.22,
      ewt: 61.51,
      comments: ['Administrator'],
      lines: [
        {
          transType: 'Supplier Invoice',
          transactionNumber: '200197',
          date: '2026-10-09',
          supplierInvoice: 'Supp Inv. # 45281',
          amount: 6888.83,
        },
        {
          transType: 'Supplier Debit Memo',
          transactionNumber: '227005',
          date: '2026-10-07',
          supplierInvoice: 'Supp Inv. # RS#214868',
          amount: -1503.68,
        },
        {
          transType: 'Supplier Payment',
          transactionNumber: '900',
          date: '2026-10-09',
          supplierInvoice: '',
          amount: 100,
        },
      ],
    });

    const headerQuery = calls.find((call) => call.sql.includes('0_cv_header'));
    expect(headerQuery?.sql).toContain('`srs_aria_nova`.`0_cv_header`');
    expect(headerQuery?.bindings).toEqual([158060]);
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
