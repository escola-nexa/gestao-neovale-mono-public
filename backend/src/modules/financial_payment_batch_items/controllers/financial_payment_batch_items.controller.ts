import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPaymentBatchItemsDto } from '../dto/create-financial_payment_batch_items.dto';
import { UpdateFinancialPaymentBatchItemsDto } from '../dto/update-financial_payment_batch_items.dto';
import { FindFinancialPaymentBatchItemsService } from '../services/find-financial_payment_batch_items.service';
import { CreateFinancialPaymentBatchItemsService } from '../services/create-financial_payment_batch_items.service';
import { UpdateFinancialPaymentBatchItemsService } from '../services/update-financial_payment_batch_items.service';
import { DeleteFinancialPaymentBatchItemsService } from '../services/delete-financial_payment_batch_items.service';

@Controller('financial-payment-batch-items')
@UseGuards(JwtAuthGuard)
export class FinancialPaymentBatchItemsController {
  constructor(
    private readonly findService: FindFinancialPaymentBatchItemsService,
    private readonly createService: CreateFinancialPaymentBatchItemsService,
    private readonly updateService: UpdateFinancialPaymentBatchItemsService,
    private readonly deleteService: DeleteFinancialPaymentBatchItemsService,
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
  async create(@Body() dto: CreateFinancialPaymentBatchItemsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPaymentBatchItemsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
