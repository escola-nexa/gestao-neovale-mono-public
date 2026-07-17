import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { FinanceiroService } from '../services/financeiro.service';

@Controller('financeiro/payments')
@UseGuards(JwtAuthGuard)
export class FinanceiroPaymentsController {
  constructor(private readonly finService: FinanceiroService) {}

  @Get('installments/:id')
  async getInstallment(@Param('id') id: string) {
    return this.finService.getInstallment(id);
  }

  @Get('entries/:id')
  async getEntry(@Param('id') id: string) {
    return this.finService.getEntry(id);
  }

  @Post()
  async createPayment(@Body() body: any) {
    return this.finService.createPayment(body);
  }

  @Post('reverse')
  async reversePayment(@Body() body: any) {
    return this.finService.reversePayment(body);
  }

  @Post(':id/receipt')
  async uploadReceipt(@Param('id') id: string, @Body() body: any) {
    // Requires Multipart/form-data handling in a real implementation
    return { success: true };
  }

  @Get('batches')
  async getBatches() {
    return this.finService.getPaymentBatches();
  }

  @Get('batches/:id')
  async getBatchById(@Param('id') id: string) {
    return this.finService.getPaymentBatch(id);
  }

  @Post('batches')
  async createBatch(@Body() body: any) {
    return this.finService.createPaymentBatch(body);
  }

  @Post('batches/:id/sent')
  async markBatchSent(@Param('id') id: string) {
    return this.finService.markBatchSent(id);
  }

  @Post('batches/items/:id/process')
  async processBatchItem(@Param('id') id: string, @Body() body: any) {
    return this.finService.processBatchItem(id, body);
  }

  @Post('batches/items/:id/pix')
  async processBatchPix(@Param('id') id: string, @Body() body: any) {
    return this.finService.processBatchPix(id, body);
  }
}
