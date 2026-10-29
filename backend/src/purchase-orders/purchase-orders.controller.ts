import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Logger,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  private readonly logger = new Logger(PurchaseOrdersController.name);

  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() body: unknown) {
    try {
      return await this.purchaseOrdersService.search(body);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load purchase orders',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load Purchase Order records. Please check the server connection.',
      );
    }
  }

  @Get('print')
  @HttpCode(200)
  async print(@Query() query: Record<string, unknown>) {
    try {
      return await this.purchaseOrdersService.print(query);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load the purchase order',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load the purchase order. Please check the server connection.',
      );
    }
  }
}
