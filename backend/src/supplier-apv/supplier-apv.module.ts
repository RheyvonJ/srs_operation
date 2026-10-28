import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SupplierApvController } from './supplier-apv.controller.js';
import { SupplierApvService } from './supplier-apv.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SupplierApvController],
  providers: [SupplierApvService],
})
export class SupplierApvModule {}
