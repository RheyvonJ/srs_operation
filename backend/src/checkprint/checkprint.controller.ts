import { Body, Controller, Get, HttpException, Logger, Post, Query, ServiceUnavailableException } from '@nestjs/common';
import { CheckprintService } from './checkprint.service.js';

@Controller('checkprint')
export class CheckprintController {
  private readonly logger = new Logger(CheckprintController.name);
  constructor(private readonly service: CheckprintService) {}

  @Get('voucher')
  async voucher(@Query() query: Record<string, unknown>) {
    try { return await this.service.voucher(query); }
    catch (e) { this.handle(e, 'Could not load the Check Voucher.'); }
  }

  @Get('list')
  async list(@Query() query: Record<string, unknown>) {
    try { return await this.service.list(query); }
    catch (e) { this.handle(e, 'Could not load Check Vouchers.'); }
  }

  @Post('voucher/printed')
  async markPrinted(@Body() body: unknown) {
    try { return await this.service.markPrinted(body); }
    catch (e) { this.handle(e, 'Could not update Check Voucher print status.'); }
  }

  @Get('accounts')
  async accounts(@Query() query: Record<string, unknown>) {
    try { return await this.service.checkAccounts(query); }
    catch (e) { this.handle(e, 'Could not load checking accounts.'); }
  }

  @Get('accounts/unassigned')
  async unassignedAccounts(@Query() query: Record<string, unknown>) {
    try { return await this.service.unassignedAccounts(query); }
    catch (e) { this.handle(e, 'Could not load unassigned bank accounts.'); }
  }

  @Post('accounts')
  async saveAccount(@Body() body: unknown) {
    try { return await this.service.saveCheckAccount(body); }
    catch (e) { this.handle(e, 'Could not save the checking account.'); }
  }

  @Post('accounts/delete')
  async deleteAccount(@Body() body: unknown) {
    try { return await this.service.deleteCheckAccount(body); }
    catch (e) { this.handle(e, 'Could not delete the checking account.'); }
  }

  @Get('checks')
  async checks(@Query() query: Record<string, unknown>) {
    try { return await this.service.checks(query); }
    catch (e) { this.handle(e, 'Could not load issued checks.'); }
  }

  @Post('issue')
  async issue(@Body() body: unknown) {
    try { return await this.service.issue(body); }
    catch (e) { this.handle(e, 'Could not issue the check.'); }
  }

  @Post('check-reference')
  async setNextCheckReference(@Body() body: unknown) {
    try { return await this.service.setNextCheckReference(body); }
    catch (e) { this.handle(e, 'Could not update the next check number.'); }
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>) {
    try { return await this.service.exportChecks(query); }
    catch (e) { this.handle(e, 'Could not generate the bank check export.'); }
  }

  private handle(error: unknown, message: string): never {
    if (error instanceof HttpException) throw error;
    this.logger.error(message, error instanceof Error ? error.stack : undefined);
    throw new ServiceUnavailableException(`${message} Please check the server connection.`);
  }
}
