import {
  Controller,
  Get,
  HttpException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BranchesService } from './branches.service.js';

@Controller('branches')
export class BranchesController {
  private readonly logger = new Logger(BranchesController.name);

  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async list() {
    try {
      return await this.branchesService.list();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Failed to load branches from transfers.0_branches',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not load the branch list. Please check the server connection.',
      );
    }
  }
}
