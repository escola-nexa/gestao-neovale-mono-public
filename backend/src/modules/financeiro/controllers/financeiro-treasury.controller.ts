import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { FinanceiroService } from '../services/financeiro.service';

@Controller('financeiro/treasury')
@UseGuards(JwtAuthGuard)
export class FinanceiroTreasuryController {
  constructor(private readonly finService: FinanceiroService) {}

  @Get('balances')
  async getBalances(@Query('horizonDays') horizonDays: string) {
    return this.finService.getTreasuryBalances(Number(horizonDays) || 0);
  }

  @Get('transactions')
  async getTransactions(@Query('accountId') accountId: string, @Query('status') status: string) {
    return this.finService.getTreasuryTransactions(accountId, status);
  }

  @Post('import-statement')
  async importStatement(@Body() body: any) {
    return this.finService.importStatement(body);
  }

  @Post('auto-reconcile')
  async autoReconcile(@Body() body: any) {
    return this.finService.autoReconcile(body);
  }

  @Post('reconcile-match')
  async reconcileMatch(@Body() body: any) {
    return this.finService.reconcileMatch(body);
  }

  @Post('undo-reconcile')
  async undoReconcile(@Body() body: any) {
    return this.finService.undoReconcile(body);
  }

  @Get('transfers')
  async getTransfers() {
    return this.finService.getTransfers();
  }

  @Post('transfers')
  async createTransfer(@Body() body: any) {
    return this.finService.createTransfer(body);
  }

  @Post('transfers/cancel')
  async cancelTransfer(@Body() body: any) {
    return this.finService.cancelTransfer(body);
  }

  @Get('import-batches')
  async getImportBatches(@Query('accountId') accountId: string) {
    return this.finService.getImportBatches(accountId);
  }
}
