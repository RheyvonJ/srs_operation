import { ServiceUnavailableException } from '@nestjs/common';
import type { Knex } from 'knex';
import { describe, expect, it } from 'vitest';
import { BranchesController } from './branches.controller.js';
import { BranchesService, type BranchRecord } from './branches.service.js';

function queryReturning(rows: Array<Record<string, unknown>>) {
  const calls: string[] = [];
  const query = {
    withSchema(schema: string) {
      calls.push(`schema:${schema}`);
      return query;
    },
    from(table: string) {
      calls.push(`from:${table}`);
      return query;
    },
    select(...columns: string[]) {
      calls.push(`select:${columns.join(',')}`);
      return query;
    },
    where(column: string, value: unknown) {
      calls.push(`where:${column}=${String(value)}`);
      return query;
    },
    orderBy(column: string, direction: string) {
      calls.push(`order:${column}:${direction}`);
      return Promise.resolve(rows);
    },
  };
  return { query, calls };
}

describe('BranchesService', () => {
  it('reads active branch id, code, and name from transfers.0_branches', async () => {
    const { query, calls } = queryReturning([
      { id: 48, code: 'srslogistics', name: ' LOGISTICS' },
      { id: 2, code: 'sri', name: 'IMUS' },
      { id: 1, code: 'srsn', name: '  NOVALICHES  ' },
      { id: 9, code: 'srsg', name: '' },
    ]);
    const service = new BranchesService(query as unknown as Knex);

    await expect(service.list()).resolves.toEqual([
      { id: 2, code: 'sri', name: 'IMUS' },
      { id: 48, code: 'srslogistics', name: 'LOGISTICS' },
      { id: 1, code: 'srsn', name: 'NOVALICHES' },
      { id: 9, code: 'srsg', name: 'srsg' },
    ]);
    expect(calls).toEqual([
      'schema:transfers',
      'from:0_branches',
      'select:id,code,name',
      'where:inactive=0',
      'order:name:asc',
    ]);
  });
});

describe('BranchesController', () => {
  it('returns the branch list', async () => {
    const branches: BranchRecord[] = [{ id: 1, code: 'srsn', name: 'NOVALICHES' }];
    const controller = new BranchesController({
      list: async () => branches,
    } as BranchesService);

    await expect(controller.list()).resolves.toEqual(branches);
  });

  it('turns a database connection failure into a service error', async () => {
    const controller = new BranchesController({
      list: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    } as BranchesService);

    await expect(controller.list()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
