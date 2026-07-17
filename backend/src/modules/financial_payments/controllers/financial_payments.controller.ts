import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPaymentsDto } from '../dto/create-financial_payments.dto';
import { UpdateFinancialPaymentsDto } from '../dto/update-financial_payments.dto';
import { FindFinancialPaymentsService } from '../services/find-financial_payments.service';
import { CreateFinancialPaymentsService } from '../services/create-financial_payments.service';
import { UpdateFinancialPaymentsService } from '../services/update-financial_payments.service';
import { DeleteFinancialPaymentsService } from '../services/delete-financial_payments.service';

@Controller('financial-payments')
@UseGuards(JwtAuthGuard)
export class FinancialPaymentsController {
  constructor(
    private readonly findService: FindFinancialPaymentsService,
    private readonly createService: CreateFinancialPaymentsService,
    private readonly updateService: UpdateFinancialPaymentsService,
    private readonly deleteService: DeleteFinancialPaymentsService,
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
  async create(@Body() dto: CreateFinancialPaymentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPaymentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
