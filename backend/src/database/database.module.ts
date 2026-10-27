import { Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { type Knex } from 'knex';

export const KNEX = Symbol('KNEX');

class KnexLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger(KnexLifecycle.name);
  readonly client: Knex;

  constructor(config: ConfigService) {
    this.client = knex({
      client: 'mysql2',
      connection: {
        host: config.get<string>('DB_HOST', '192.168.0.91'),
        port: config.get<number>('DB_PORT', 3306),
        user: config.get<string>('DB_USER', 'user'),
        password: config.get<string>('DB_PASSWORD', 'srsnova'),
        database: config.get<string>('DB_NAME', 'srs_aria_agora'),
      },
      pool: {
        min: 0,
        max: 5,
      },
    });
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.client.destroy();
    } catch (error) {
      this.logger.error(
        'Failed to close the MySQL connection pool',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

@Module({
  providers: [
    {
      provide: KnexLifecycle,
      useFactory: (config: ConfigService) => new KnexLifecycle(config),
      inject: [ConfigService],
    },
    {
      provide: KNEX,
      useFactory: (lifecycle: KnexLifecycle) => lifecycle.client,
      inject: [KnexLifecycle],
    },
  ],
  exports: [KNEX],
})
export class DatabaseModule {}
