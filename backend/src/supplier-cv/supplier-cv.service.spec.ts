import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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

function createService(db: Knex) {
  return new SupplierCvService(db, {} as never, {} as never, {} as never);
}

describe('SupplierCvService', () => {
  it('requires a supplier TIN before querying', async () => {
    const { db, calls } = createDb([]);
    const service = createService(db);

    await expect(service.search({ ...search, tin: '  ' })).rejects.toThrow(
      'Please Input Your TIN#.',
    );
    expect(calls).toHaveLength(0);
  });

  it('requires a branch code', async () => {
    const { db } = createDb([]);
    const service = createService(db);

    await expect(service.search({ ...search, branchCode: '' })).rejects.toThrow(
      'Please select a branch.',
    );
  });

  it('rejects a branch that has no accounting database', async () => {
    const { db, calls } = createDb([{ includes: '0_branches', rows: [{ ariaDb: 'not a db' }] }]);
    const service = createService(db);

    await expect(service.search(search)).rejects.toThrow('Selected branch is not available.');
    expect(calls).toHaveLength(1);
  });

  it('reports a missing supplier', async () => {
    const { db } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_nova' }] },
      { includes: 'gst_no', rows: [] },
    ]);
    const service = createService(db);

    await expect(service.search(search)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.search(search)).rejects.toThrow('Supplier Not Found.');
  });

  it('reports a supplier with no CV in the date range', async () => {
    const { db } = createDb([
      { includes: '0_branches', rows: [{ ariaDb: 'srs_aria_nova' }] },
      { includes: 'gst_no', rows: [{ supplierId: 15 }] },
      { includes: '0_cv_header', rows: [] },
    ]);
    const service = createService(db);

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
    const service = createService(db);

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
    const service = createService(db);

    await expect(service.viewCheckVoucher({ branch: '4', trans_no: '158060' })).resolves.toEqual({
      cvNo: '1634354',
      cvDate: '2026-10-09',
      supplierName: 'Sample Supplier',
      amount: 2175.22,
      ewt: 61.51,
      comments: ['Administrator'],
      lines: [
        {
          transType: 'AP Voucher',
          transactionNumber: '200197',
          transNo: 158335,
          transTypeId: 20,
          date: '2026-10-09',
          supplierInvoice: 'Supp Inv. # 45281',
          amount: 6888.83,
        },
        {
          transType: 'Supplier Debit Memo',
          transactionNumber: '227005',
          transNo: 229582,
          transTypeId: 53,
          date: '2026-10-07',
          supplierInvoice: 'Supp Inv. # RS#214868',
          amount: -1503.68,
        },
        {
          transType: 'Supplier Payment',
          transactionNumber: '900',
          transNo: 900,
          transTypeId: 22,
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

describe('bir2307', () => {
  const query = { branch: '4', type: '24', trans_no: '900', supplier_id: '44' };

  it('rejects a print request that is missing its transaction', async () => {
    const { db, calls } = createDb([]);
    const service = createService(db);

    await expect(service.bir2307({ ...query, trans_no: '0' })).rejects.toThrow('BIR 2307 was not found.');
    expect(calls).toHaveLength(0);
  });

  it('fills the certificate from the withholding lines without repeating the income', async () => {
    const { db, calls } = createDb([
      { includes: '0_branches', rows: [{ id: 1, configDbKey: 4, ariaDb: 'srs_aria_nova' }] },
      {
        includes: 'pay_to',
        rows: [
          {
            suppName: 'ACME (OLD)',
            payTo: 'ACME TRADING',
            address: 'Quezon &amp; City',
            gstNo: '004-526-681',
            suppRef: 'FIPGEI001',
          },
        ],
      },
      {
        includes: 'gl.amount < 0',
        rows: [
          { tranDate: '2024-02-10', amount: -10.5, atc: 'WC160' },
          { tranDate: '2024-02-10', amount: -4.5, atc: 'WC158' },
        ],
      },
      { includes: '1410013', rows: [{ amount: 1000 }] },
      { includes: 'non_trade', rows: [{ suppReference: '45281' }] },
    ]);
    const service = createService(db);

    await expect(service.bir2307(query)).resolves.toMatchObject({
      periodFrom: { month: '02', day: '1', year: '24' },
      periodTo: { month: '02', day: '29', year: '24' },
      quarterSlot: 2,
      payeeTin: ['004', '526', '681', '000'],
      payeeName: 'ACME TRADING',
      payeeAddress: 'Quezon & City',
      payeeZip: '1600',
      payorTin: ['007', '492', '840', '000'],
      payorName: 'SAN ROQUE SUPERMARKET RETAIL SYSTEMS INC.',
      payorZip: '1123',
      supplierInvoice: 'SI NO. 45281',
      lines: [
        { atc: 'WC160', tax: 10.5 },
        { atc: 'WC158', tax: 4.5 },
      ],
      income: 1000,
      tax: 15,
      signatory: 'Shena O. Matira',
      signatoryTitle: 'Accounting Head / 199-683-987',
    });

    const atcQuery = calls.find((call) => call.sql.includes('gl.amount < 0'));
    expect(atcQuery?.sql).toContain('`srs_aria_nova`.`0_gl_trans`');
    expect(atcQuery?.sql).toContain('`srs_aria_nova`.`0_atc_codes`');
    expect(atcQuery?.bindings).toEqual([24, 900, 44]);
    expect(calls.find((call) => call.sql.includes('1410013'))?.bindings).toEqual([24, 900, 44]);
    expect(calls.find((call) => call.sql.includes('non_trade'))?.bindings).toEqual([900, 24]);
  });

  it('uses the supplier name before the parenthesis when pay to is blank', async () => {
    const { db } = createDb([
      { includes: '0_branches', rows: [{ id: 4, configDbKey: 4, ariaDb: 'srs_aria_nova' }] },
      {
        includes: 'pay_to',
        rows: [{ suppName: 'ACME SUPPLY (BRANCH)', payTo: '', address: '', gstNo: '004-526-681-123', suppRef: 'OTHER' }],
      },
      { includes: 'gl.amount < 0', rows: [{ tranDate: '2026-10-09', amount: -20, atc: 'WI010' }] },
      { includes: '1410013', rows: [{ amount: null }] },
      { includes: 'non_trade', rows: [{ suppReference: '' }] },
    ]);
    const service = createService(db);

    await expect(service.bir2307(query)).resolves.toMatchObject({
      periodFrom: { month: '10', day: '1', year: '26' },
      periodTo: { month: '10', day: '31', year: '26' },
      quarterSlot: 1,
      payeeTin: ['004', '526', '681', '123'],
      payeeName: 'ACME SUPPLY ',
      payeeZip: '',
      supplierInvoice: '',
      income: 0,
      tax: 20,
    });
  });

  it('reports a missing supplier', async () => {
    const { db } = createDb([
      { includes: '0_branches', rows: [{ id: 4, configDbKey: 4, ariaDb: 'srs_aria_nova' }] },
      { includes: 'pay_to', rows: [] },
    ]);
    const service = createService(db);

    await expect(service.bir2307(query)).rejects.toBeInstanceOf(NotFoundException);
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

  it('turns a BIR 2307 database failure into a service error', async () => {
    const controller = new SupplierCvController({
      bir2307: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    } as SupplierCvService);

    await expect(controller.bir2307({ branch: '4' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

