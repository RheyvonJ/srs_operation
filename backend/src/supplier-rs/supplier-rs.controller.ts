import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupplierRsService } from './supplier-rs.service.js';

@Controller('supplier-rs')
export class SupplierRsController {
  private readonly logger = new Logger(SupplierRsController.name);

  constructor(private readonly supplierRsService: SupplierRsService) {}

  @Get('suppliers')
  async suppliers() {
    try {
      return await this.supplierRsService.suppliers();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load return-to-supplier vendors',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load suppliers. Please check the server connection.',
      );
    }
  }

  @Post('search')
  @HttpCode(200)
  async search(@Body() body: unknown) {
    try {
      return await this.supplierRsService.search(body);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load return-to-supplier records',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load Supplier RS records. Please check the server connection.',
      );
    }
  }
}
