import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialInstallmentsDto } from '../dto/create-financial_installments.dto';
import { UpdateFinancialInstallmentsDto } from '../dto/update-financial_installments.dto';
import { FindFinancialInstallmentsService } from '../services/find-financial_installments.service';
import { CreateFinancialInstallmentsService } from '../services/create-financial_installments.service';
import { UpdateFinancialInstallmentsService } from '../services/update-financial_installments.service';
import { DeleteFinancialInstallmentsService } from '../services/delete-financial_installments.service';

@Controller('financial-installments')
@UseGuards(JwtAuthGuard)
export class FinancialInstallmentsController {
  constructor(
    private readonly findService: FindFinancialInstallmentsService,
    private readonly createService: CreateFinancialInstallmentsService,
    private readonly updateService: UpdateFinancialInstallmentsService,
    private readonly deleteService: DeleteFinancialInstallmentsService,
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
  async create(@Body() dto: CreateFinancialInstallmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialInstallmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
