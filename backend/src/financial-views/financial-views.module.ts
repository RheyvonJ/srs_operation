import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { FinancialViewsController } from './financial-views.controller.js';
import { FinancialViewsService } from './financial-views.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [FinancialViewsController],
  providers: [FinancialViewsService],
})
export class FinancialViewsModule {}
