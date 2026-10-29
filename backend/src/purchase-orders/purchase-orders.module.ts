import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import {
  PO_KNEX,
  PurchaseOrderConnections,
  RECEIVED_KNEX,
} from './purchase-order-connections.js';
import { PurchaseOrdersController } from './purchase-orders.controller.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PurchaseOrdersController],
  providers: [
    PurchaseOrderConnections,
    {
      provide: PO_KNEX,
      useFactory: (connections: PurchaseOrderConnections) => connections.orders,
      inject: [PurchaseOrderConnections],
    },
    {
      provide: RECEIVED_KNEX,
      useFactory: (connections: PurchaseOrderConnections) => connections.received,
      inject: [PurchaseOrderConnections],
    },
    PurchaseOrdersService,
  ],
})
export class PurchaseOrdersModule {}
