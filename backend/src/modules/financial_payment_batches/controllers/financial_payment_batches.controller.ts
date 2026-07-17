import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPaymentBatchesDto } from '../dto/create-financial_payment_batches.dto';
import { UpdateFinancialPaymentBatchesDto } from '../dto/update-financial_payment_batches.dto';
import { FindFinancialPaymentBatchesService } from '../services/find-financial_payment_batches.service';
import { CreateFinancialPaymentBatchesService } from '../services/create-financial_payment_batches.service';
import { UpdateFinancialPaymentBatchesService } from '../services/update-financial_payment_batches.service';
import { DeleteFinancialPaymentBatchesService } from '../services/delete-financial_payment_batches.service';

@Controller('financial-payment-batches')
@UseGuards(JwtAuthGuard)
export class FinancialPaymentBatchesController {
  constructor(
    private readonly findService: FindFinancialPaymentBatchesService,
    private readonly createService: CreateFinancialPaymentBatchesService,
    private readonly updateService: UpdateFinancialPaymentBatchesService,
    private readonly deleteService: DeleteFinancialPaymentBatchesService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateFinancialPaymentBatchesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPaymentBatchesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
