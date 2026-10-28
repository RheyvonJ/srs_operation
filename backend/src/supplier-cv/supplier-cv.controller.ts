import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupplierCvService } from './supplier-cv.service.js';

@Controller('supplier-cv')
export class SupplierCvController {
  private readonly logger = new Logger(SupplierCvController.name);

  constructor(private readonly supplierCvService: SupplierCvService) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() body: unknown) {
    try {
      return await this.supplierCvService.search(body);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load supplier CV records',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load Supplier CV records. Please check the server connection.',
      );
    }
  }
}
