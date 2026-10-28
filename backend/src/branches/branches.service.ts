import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';

export interface BranchRecord {
  id: number;
  code: string;
  name: string;
}

interface BranchRow {
  id: number | string;
  code: string | null;
  name: string | null;
}

@Injectable()
export class BranchesService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  async list(): Promise<BranchRecord[]> {
    const rows = await this.db
      .withSchema('transfers')
      .from<BranchRow>('0_branches')
      .select('id', 'code', 'name')
      .where('inactive', 0)
      .orderBy('name', 'asc');

    return rows
      .flatMap((row) => {
        const code = (row.code ?? '').trim();
        const name = (row.name ?? '').trim() || code;
        if (!name) return [];
        return [{ id: Number(row.id), code: code || String(row.id), name }];
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
  }
}
