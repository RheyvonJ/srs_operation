import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupplierApvService } from './supplier-apv.service.js';

@Controller('supplier-apv')
export class SupplierApvController {
  private readonly logger = new Logger(SupplierApvController.name);

  constructor(private readonly supplierApvService: SupplierApvService) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() body: unknown) {
    try {
      return await this.supplierApvService.search(body);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load supplier APV records',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load Supplier APV records. Please check the server connection.',
      );
    }
  }
}
