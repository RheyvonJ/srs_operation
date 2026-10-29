import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConsignmentSalesService } from './consignment-sales.service.js';

@Controller('consignment-sales')
export class ConsignmentSalesController {
  private readonly logger = new Logger(ConsignmentSalesController.name);

  constructor(private readonly consignmentSalesService: ConsignmentSalesService) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() body: unknown) {
    try {
      return await this.consignmentSalesService.search(body);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load consignment sales',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load Consignment Sales records. Please check the server connection.',
      );
    }
  }
}
