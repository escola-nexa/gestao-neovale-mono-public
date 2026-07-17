import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPaymentTermsDto } from '../dto/create-financial_payment_terms.dto';
import { UpdateFinancialPaymentTermsDto } from '../dto/update-financial_payment_terms.dto';
import { FindFinancialPaymentTermsService } from '../services/find-financial_payment_terms.service';
import { CreateFinancialPaymentTermsService } from '../services/create-financial_payment_terms.service';
import { UpdateFinancialPaymentTermsService } from '../services/update-financial_payment_terms.service';
import { DeleteFinancialPaymentTermsService } from '../services/delete-financial_payment_terms.service';

@Controller('financial-payment-terms')
@UseGuards(JwtAuthGuard)
export class FinancialPaymentTermsController {
  constructor(
    private readonly findService: FindFinancialPaymentTermsService,
    private readonly createService: CreateFinancialPaymentTermsService,
    private readonly updateService: UpdateFinancialPaymentTermsService,
    private readonly deleteService: DeleteFinancialPaymentTermsService,
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
  async create(@Body() dto: CreateFinancialPaymentTermsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPaymentTermsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
