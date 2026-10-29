import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Knex } from 'knex';
import { describe, expect, it } from 'vitest';
import { PurchaseOrdersController } from './purchase-orders.controller.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

const search = {
  branchCode: 'all',
  from: '2026-01-01',
  to: '2026-10-29',
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

function serviceFor(
  catalogResponses: Array<{ includes: string; rows: unknown[] }>,
  orderResponses: Array<{ includes: string; rows: unknown[] }> = [],
  receiptResponses: Array<{ includes: string; rows: unknown[] }> = [],
) {
  const catalog = createDb(catalogResponses);
  const orders = createDb(orderResponses);
  const received = createDb(receiptResponses);
  return {
    service: new PurchaseOrdersService(catalog.db, orders.db, received.db),
    catalog: catalog.calls,
    orders: orders.calls,
    received: received.calls,
  };
}

describe('PurchaseOrdersService', () => {
  it('requires a supplier TIN before querying', async () => {
    const { service, catalog } = serviceFor([]);

    await expect(service.search({ ...search, tin: '   ' })).rejects.toThrow('Please Input Your TIN#.');
    expect(catalog).toHaveLength(0);
  });

  it('rejects an invalid date range and an unsafe branch code', async () => {
    const { service, catalog } = serviceFor([]);

    await expect(service.search({ ...search, from: '2026-13-01' })).rejects.toThrow(
      'Please enter a valid date range.',
    );
    await expect(service.search({ ...search, branchCode: "srs' OR 1=1" })).rejects.toThrow(
      'Please select a branch.',
    );
    expect(catalog).toHaveLength(0);
  });

  it('reports an unknown TIN without querying purchase orders', async () => {
    const { service, orders } = serviceFor([{ includes: 'gst_no', rows: [] }]);

    await expect(service.search(search)).rejects.toThrow('Invalid TIN or No Purchase Order');
    expect(orders).toHaveLength(0);
  });

  it('reports a supplier with no purchase orders in the date range', async () => {
    const { service, received } = serviceFor(
      [
        { includes: 'gst_no', rows: [{ supplierRef: 'SUP-1' }] },
        { includes: '0_branches', rows: [] },
      ],
      [{ includes: 'purch_orders', rows: [] }],
    );

    await expect(service.search(search)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.search(search)).rejects.toThrow('Invalid TIN or No Purchase Order');
    expect(received).toHaveLength(0);
  });

  it('lists purchase orders with supplier subtotals, receiving, and a branch filter', async () => {
    const { service, orders, received } = serviceFor(
      [
        { includes: 'gst_no', rows: [{ supplierRef: 'SUP-1' }, { supplierRef: 'SUP-2' }] },
        {
          includes: '0_branches',
          rows: [
            { code: 'srsisidro', name: 'Isidro' },
            { code: 'srsagora', name: 'Agora' },
          ],
        },
      ],
      [
        {
          includes: 'purch_orders',
          rows: [
            {
              supplierId: 'SUP-1',
              supplierName: 'Acme Foods',
              reference: 'PO100',
              orderNo: 100,
              branchCode: 'srsisidro',
              transDate: '2026-02-01',
              netTotal: '1500.5',
              email: 1,
              status: 0,
            },
            {
              supplierId: 'SUP-1',
              supplierName: 'Acme Foods',
              reference: 'PO101',
              orderNo: 101,
              branchCode: 'srsagora',
              transDate: '2026-02-02',
              netTotal: 20,
              email: 0,
              status: 2,
            },
            {
              supplierId: 'SUP-2',
              supplierName: 'Beta Trading',
              reference: 'PO200',
              orderNo: 200,
              branchCode: 'unknown',
              transDate: '2026-03-01',
              netTotal: 9.999,
              email: '1',
              status: 3,
            },
          ],
        },
      ],
      [
        {
          includes: 'received_purcahses',
          rows: [
            { purchaseOrderNo: 'PO100', branch: 'srsisidro', dateReceived: '2026-02-03', totExtended: 10.5 },
            { purchaseOrderNo: 'PO100', branch: 'srsisidro', dateReceived: '2026-02-03 15:00:00', totExtended: 1.25 },
            { purchaseOrderNo: 'PO100', branch: 'srsisidro', dateReceived: '2026-02-04', totExtended: 3 },
          ],
        },
      ],
    );

    await expect(service.search({ ...search, branchCode: 'srsisidro' })).resolves.toEqual({
      groups: [
        {
          supplierId: 'SUP-1',
          supplierName: 'Acme Foods',
          subtotal: 1520.5,
          rows: [
            {
              line: 1,
              supplierId: 'SUP-1',
              supplierName: 'Acme Foods',
              reference: 'PO100',
              orderNo: '100',
              branchName: 'Isidro',
              transDate: '2026-02-01',
              netTotal: 1500.5,
              emailStatus: 'Sent',
              poStatus: 'Approved',
              print: { branch: 'srsisidro', orderNo: '100', reference: 'PO100', supplierId: 'SUP-1' },
              receivedDates: '02/03/2026,02/04/2026',
              receivedTotal: 14.75,
            },
            {
              line: 2,
              supplierId: 'SUP-1',
              supplierName: 'Acme Foods',
              reference: 'PO101',
              orderNo: '101',
              branchName: 'Agora',
              transDate: '2026-02-02',
              netTotal: 20,
              emailStatus: 'Pending',
              poStatus: 'Cancelled',
              print: { branch: 'srsagora', orderNo: '101', reference: 'PO101', supplierId: 'SUP-1' },
              receivedDates: '-',
              receivedTotal: null,
            },
          ],
        },
        {
          supplierId: 'SUP-2',
          supplierName: 'Beta Trading',
          subtotal: 10,
          rows: [
            {
              line: 3,
              supplierId: 'SUP-2',
              supplierName: 'Beta Trading',
              reference: 'PO200',
              orderNo: '200',
              branchName: 'unknown',
              transDate: '2026-03-01',
              netTotal: 10,
              emailStatus: 'Sent',
              poStatus: 'Expired',
              print: { branch: 'unknown', orderNo: '200', reference: 'PO200', supplierId: 'SUP-2' },
              receivedDates: '-',
              receivedTotal: null,
            },
          ],
        },
      ],
      grandTotal: 1530.5,
    });

    const orderQuery = orders.find((call) => call.sql.includes('purch_orders'));
    expect(orderQuery?.sql).toContain('p.trans_type = 16');
    expect(orderQuery?.sql).toContain('p.br_code = ?');
    expect(orderQuery?.sql).not.toContain(search.tin);
    expect(orderQuery?.bindings).toEqual(['2026-01-01', '2026-10-29', 'SUP-1', 'SUP-2', 'srsisidro']);
    expect(received[0]?.sql).toContain('received_po.received_purcahses');
    expect(received[0]?.bindings).toEqual(['PO100', 'srsisidro', 'PO101', 'srsagora', 'PO200', 'unknown']);
  });

  it('does not filter by branch when all branches are selected', async () => {
    const { service, orders } = serviceFor(
      [
        { includes: 'gst_no', rows: [{ supplierRef: 'SUP-1' }] },
        { includes: '0_branches', rows: [] },
      ],
      [
        {
          includes: 'purch_orders',
          rows: [
            {
              supplierId: 'SUP-1',
              supplierName: 'Acme',
              reference: '',
              orderNo: 1,
              branchCode: 'srsn',
              transDate: '2026-01-02',
              netTotal: 5,
              email: null,
              status: null,
            },
          ],
        },
      ],
    );

    const result = await service.search({ ...search, branchCode: '' });
    expect(result.groups[0]?.rows[0]).toMatchObject({
      emailStatus: 'Pending',
      poStatus: 'Approved',
      receivedDates: '-',
      receivedTotal: null,
    });
    expect(orders[0]?.sql).not.toContain('p.br_code = ?');
    expect(orders[0]?.bindings).toEqual(['2026-01-01', '2026-10-29', 'SUP-1']);
  });
});

describe('PurchaseOrdersService print', () => {
  const printQuery = {
    branch: 'srsagora',
    order_no: '100',
    ref: 'PO100',
    supplier_id: 'SUP-1',
  };

  it('rejects an unsafe branch before querying', async () => {
    const { service, orders, catalog } = serviceFor([]);

    await expect(service.print({ ...printQuery, branch: "srs' OR 1=1" })).rejects.toThrow('Please select a branch.');
    expect(orders).toHaveLength(0);
    expect(catalog).toHaveLength(0);
  });

  it('reports a missing purchase order', async () => {
    const { service, orders } = serviceFor(
      [{ includes: 'db_56', rows: [{ vendorDb: 'SRSMNOVA' }] }],
      [
        { includes: 'srs.branches', rows: [] },
        { includes: 'delivery_address', rows: [] },
      ],
    );

    await expect(service.print(printQuery)).rejects.toBeInstanceOf(NotFoundException);
    expect(orders.some((call) => call.sql.includes('purch_order_details'))).toBe(false);
  });

  it('builds the purchase order with discounts, remarks, and signatures', async () => {
    const { service, orders } = serviceFor(
      [{ includes: 'db_56', rows: [{ vendorDb: 'SRSMNOVA' }] }],
      [
        { includes: 'srs.branches', rows: [{ address: 'Agora St.', tin: '000-111-222' }] },
        {
          includes: 'delivery_address',
          rows: [{ transDate: '2026-02-01', deliveryDate: '2026-02-15', deliveryAddress: 'Receiving Dock' }],
        },
        {
          includes: 'vendor.vendorcode',
          rows: [{
            termDesc: '30 days',
            vendorName: 'Acme Foods',
            address: 'Vendor St.',
            contactPerson: 'Ana Cruz',
          }],
        },
        {
          includes: 'purch_order_details',
          rows: [
            { barcode: '111', description: 'Rice', unit: 'PC', quantity: 10, unitPrice: 12.5, discounts: 'Promo=>5,skip' },
            { barcode: '222', description: 'Oil', unit: 'BTL', quantity: 1, unitPrice: 3, discounts: '' },
          ],
        },
        { includes: 'srs.comments', rows: [{ id: 100, trans_type: 16, memo: 'Deliver before noon' }] },
        { includes: 'a.trans_ref', rows: [{ preparedBy: 'Jane Doe', sign: '../jane.png' }] },
        { includes: 'approvedBy', rows: [{ approvedBy: 'John Cruz', sign: '' }] },
      ],
    );

    await expect(service.print(printQuery)).resolves.toEqual({
      companyName: 'SAN ROQUE SUPERMARKET RETAIL SYSTEMS, INC.',
      branchAddress: 'Agora St.',
      branchTin: '000-111-222',
      reference: 'PO100',
      transDate: '2026-02-01',
      validUntil: '2026-02-15',
      vendorName: 'Acme Foods',
      vendorAddress: 'Vendor St.',
      contactPerson: 'Ana Cruz',
      deliveryAddress: 'Receiving Dock',
      terms: '30 days',
      lines: [
        { barcode: '111', description: 'Rice', unit: 'PC', quantity: 10, unitPrice: 12.5, extended: 120 },
        { barcode: '222', description: 'Oil', unit: 'BTL', quantity: 1, unitPrice: 3, extended: 3 },
      ],
      totalQuantity: 11,
      grandTotal: 123,
      remarks: 'Deliver before noon',
      preparedBy: 'Jane Doe',
      preparedBySign: 'jane.png',
      approvedBy: 'John Cruz',
      approvedBySign: '',
    });

    const vendorQuery = orders.find((call) => call.sql.includes('vendor.vendorcode'));
    expect(vendorQuery?.sql).toContain('`SRSMNOVA`.vendor');
    expect(vendorQuery?.bindings).toEqual(['SUP-1']);
    expect(vendorQuery?.sql).not.toContain(printQuery.supplier_id + "'");
  });
});

describe('PurchaseOrdersController', () => {
  it('turns a database failure into a service error', async () => {
    const controller = new PurchaseOrdersController({
      search: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    } as PurchaseOrdersService);

    await expect(controller.search(search)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('keeps a validation error', async () => {
    const controller = new PurchaseOrdersController({
      search: async () => {
        throw new BadRequestException('Please Input Your TIN#.');
      },
    } as PurchaseOrdersService);

    await expect(controller.search(search)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('turns a print failure into a service error', async () => {
    const controller = new PurchaseOrdersController({
      print: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    } as PurchaseOrdersService);

    await expect(controller.print({ branch: 'srsagora', order_no: '1' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
