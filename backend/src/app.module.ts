import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { DatabaseModule } from './database/database.module.js';
import { ConsignmentSalesModule } from './consignment-sales/consignment-sales.module.js';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module.js';
import { SupplierApvModule } from './supplier-apv/supplier-apv.module.js';
import { SupplierCvModule } from './supplier-cv/supplier-cv.module.js';
import { SupplierRsModule } from './supplier-rs/supplier-rs.module.js';
import { CheckprintModule } from './checkprint/checkprint.module.js';
import { FinancialViewsModule } from './financial-views/financial-views.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    BranchesModule,
    SupplierCvModule,
    SupplierApvModule,
    SupplierRsModule,
    PurchaseOrdersModule,
    ConsignmentSalesModule,
    CheckprintModule,
    FinancialViewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
