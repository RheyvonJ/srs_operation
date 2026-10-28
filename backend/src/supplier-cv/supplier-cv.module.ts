import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SupplierCvController } from './supplier-cv.controller.js';
import { SupplierCvService } from './supplier-cv.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SupplierCvController],
  providers: [SupplierCvService],
})
export class SupplierCvModule {}
