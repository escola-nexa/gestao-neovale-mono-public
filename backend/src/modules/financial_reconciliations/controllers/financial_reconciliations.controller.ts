import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialReconciliationsDto } from '../dto/create-financial_reconciliations.dto';
import { UpdateFinancialReconciliationsDto } from '../dto/update-financial_reconciliations.dto';
import { FindFinancialReconciliationsService } from '../services/find-financial_reconciliations.service';
import { CreateFinancialReconciliationsService } from '../services/create-financial_reconciliations.service';
import { UpdateFinancialReconciliationsService } from '../services/update-financial_reconciliations.service';
import { DeleteFinancialReconciliationsService } from '../services/delete-financial_reconciliations.service';

@Controller('financial-reconciliations')
@UseGuards(JwtAuthGuard)
export class FinancialReconciliationsController {
  constructor(
    private readonly findService: FindFinancialReconciliationsService,
    private readonly createService: CreateFinancialReconciliationsService,
    private readonly updateService: UpdateFinancialReconciliationsService,
    private readonly deleteService: DeleteFinancialReconciliationsService,
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
  async create(@Body() dto: CreateFinancialReconciliationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialReconciliationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
