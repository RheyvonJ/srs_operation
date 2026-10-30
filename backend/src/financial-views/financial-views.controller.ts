import { Controller, Get, Query } from '@nestjs/common';
import { FinancialViewsService } from './financial-views.service.js';

@Controller('transaction-views')
export class FinancialViewsController {
  constructor(private readonly views: FinancialViewsService) {}

  @Get('gl') gl(@Query() query: Record<string, unknown>) {
    return this.views.gl(query);
  }
  @Get('bank') bank(@Query() query: Record<string, unknown>) {
    return this.views.bank(query);
  }
  @Get('check-batch') batch(@Query() query: Record<string, unknown>) {
    return this.views.batch(query);
  }
  @Get('csv') csv(@Query() query: Record<string, unknown>) {
    return this.views.csv(query);
  }
  @Get('purchase-order') purchaseOrder(
    @Query() query: Record<string, unknown>,
  ) {
    return this.views.purchaseOrder(query);
  }
  @Get('discrepancy-po') discrepancy(@Query() query: Record<string, unknown>) {
    return this.views.purchaseOrder(query, true);
  }
  @Get('grn') grn(@Query() query: Record<string, unknown>) {
    return this.views.grn(query);
  }
  @Get('supplier-credit') supplierCredit(
    @Query() query: Record<string, unknown>,
  ) {
    return this.views.supplierCredit(query);
  }
  @Get('rs') rs(@Query() query: Record<string, unknown>) {
    return this.views.rs(query);
  }
  @Get('rs-slip') rsSlip(@Query() query: Record<string, unknown>) {
    return this.views.rs(query, true);
  }
  @Get('movement') movement(@Query() query: Record<string, unknown>) {
    return this.views.rs(query, false, true);
  }
}
