import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SupplierApVoucherService } from './supplier-ap-voucher.service.js';
import { SupplierCvController } from './supplier-cv.controller.js';
import { SupplierCvService } from './supplier-cv.service.js';
import { SupplierDebitMemoViewService } from './supplier-debit-memo-view.service.js';
import { SupplierPaymentViewService } from './supplier-payment-view.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SupplierCvController],
  providers: [
    SupplierApVoucherService,
    SupplierPaymentViewService,
    SupplierDebitMemoViewService,
    SupplierCvService,
  ],
})
export class SupplierCvModule {}
