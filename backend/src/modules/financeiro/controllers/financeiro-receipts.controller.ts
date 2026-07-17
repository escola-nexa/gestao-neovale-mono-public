import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { FinanceiroService } from '../services/financeiro.service';

@Controller('financeiro/receipts')
@UseGuards(JwtAuthGuard)
export class FinanceiroReceiptsController {
  constructor(private readonly finService: FinanceiroService) {}

  @Post()
  async createReceipt(@Body() body: any) {
    return this.finService.createReceipt(body);
  }

  @Get('charges')
  async getCharges(@Query('installmentId') installmentId: string, @Query('paymentDate') paymentDate: string) {
    return this.finService.getReceiptCharges(installmentId, paymentDate);
  }

  @Post('renegotiate')
  async renegotiate(@Body() body: any) {
    return this.finService.renegotiateReceipt(body);
  }

  @Post('recalculate-overdue')
  async recalculateOverdue() {
    return this.finService.recalculateOverdueReceipt();
  }
}
