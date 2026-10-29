import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SupplierRsController } from './supplier-rs.controller.js';
import { SupplierRsService } from './supplier-rs.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SupplierRsController],
  providers: [SupplierRsService],
})
export class SupplierRsModule {}
