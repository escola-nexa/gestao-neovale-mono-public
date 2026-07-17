import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPaymentMethodsDto } from '../dto/create-financial_payment_methods.dto';
import { UpdateFinancialPaymentMethodsDto } from '../dto/update-financial_payment_methods.dto';
import { FindFinancialPaymentMethodsService } from '../services/find-financial_payment_methods.service';
import { CreateFinancialPaymentMethodsService } from '../services/create-financial_payment_methods.service';
import { UpdateFinancialPaymentMethodsService } from '../services/update-financial_payment_methods.service';
import { DeleteFinancialPaymentMethodsService } from '../services/delete-financial_payment_methods.service';

@Controller('financial-payment-methods')
@UseGuards(JwtAuthGuard)
export class FinancialPaymentMethodsController {
  constructor(
    private readonly findService: FindFinancialPaymentMethodsService,
    private readonly createService: CreateFinancialPaymentMethodsService,
    private readonly updateService: UpdateFinancialPaymentMethodsService,
    private readonly deleteService: DeleteFinancialPaymentMethodsService,
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
  async create(@Body() dto: CreateFinancialPaymentMethodsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPaymentMethodsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
