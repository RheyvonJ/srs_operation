import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ConsignmentSalesController } from './consignment-sales.controller.js';
import { ConsignmentSalesService } from './consignment-sales.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ConsignmentSalesController],
  providers: [ConsignmentSalesService],
})
export class ConsignmentSalesModule {}
