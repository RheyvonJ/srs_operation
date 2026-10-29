import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { type Knex } from 'knex';

export const PO_KNEX = Symbol('PO_KNEX');
export const RECEIVED_KNEX = Symbol('RECEIVED_KNEX');

function mysqlClient(config: ConfigService, prefix: string, host: string, database: string): Knex {
  const port = Number(config.get<string>(`${prefix}_PORT`, String(config.get<number>('DB_PORT', 3306))));
  return knex({
    client: 'mysql2',
    connection: {
      host: config.get<string>(`${prefix}_HOST`, host),
      port: Number.isInteger(port) && port > 0 ? port : 3306,
      user: config.get<string>(`${prefix}_USER`, config.get<string>('DB_USER', 'user')),
      password: config.get<string>(`${prefix}_PASSWORD`, config.get<string>('DB_PASSWORD', 'srsnova')),
      database: config.get<string>(`${prefix}_NAME`, database),
      dateStrings: true,
    },
    pool: { min: 0, max: 5 },
  });
}

@Injectable()
export class PurchaseOrderConnections implements OnApplicationShutdown {
  private readonly logger = new Logger(PurchaseOrderConnections.name);
  readonly orders: Knex;
  readonly received: Knex;

  constructor(config: ConfigService) {
    this.orders = mysqlClient(config, 'PO_DB', '192.168.0.56', 'srs');
    this.received = mysqlClient(config, 'RECEIVED_DB', '192.168.0.217', 'received_po');
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      [this.orders.destroy(), this.received.destroy()].map((closing) =>
        closing.catch((error: unknown) => {
          this.logger.error(
            'Failed to close a purchase-order MySQL pool',
            error instanceof Error ? error.stack : undefined,
          );
        }),
      ),
    );
  }
}
