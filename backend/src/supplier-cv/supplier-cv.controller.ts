import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Logger,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SupplierCvService } from './supplier-cv.service.js';
import { createBir2307Pdf } from './bir2307-pdf.js';

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

  @Get('bir2307')
  @HttpCode(200)
  async bir2307(@Query() query: Record<string, unknown>) {
    try {
      return await this.supplierCvService.bir2307(query);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load BIR 2307',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load BIR 2307. Please check the server connection.',
      );
    }
  }

  @Get('bir2307.pdf')
  async bir2307Pdf(@Query() query: Record<string, unknown>, @Res() response: Response) {
    try {
      const form = await this.supplierCvService.bir2307(query);
      const pdf = await createBir2307Pdf(form);
      response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="BIR-2307.pdf"' });
      response.end(Buffer.from(pdf));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to generate BIR 2307 PDF', error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('Could not generate BIR 2307 PDF. Please check the server connection.');
    }
  }

  @Get('view')
  @HttpCode(200)
  async view(@Query() query: Record<string, unknown>) {
    try {
      return await this.supplierCvService.viewCheckVoucher(query);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load the check voucher',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load the check voucher. Please check the server connection.',
      );
    }
  }

  @Get('transaction-view')
  @HttpCode(200)
  async transactionView(@Query() query: Record<string, unknown>) {
    try {
      return await this.supplierCvService.viewSupplierTransaction(query);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to load the supplier transaction', error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('Could not load the supplier transaction. Please check the server connection.');
    }
  }
}
