import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialApprovalLimitsDto } from '../dto/create-financial_approval_limits.dto';
import { UpdateFinancialApprovalLimitsDto } from '../dto/update-financial_approval_limits.dto';
import { FindFinancialApprovalLimitsService } from '../services/find-financial_approval_limits.service';
import { CreateFinancialApprovalLimitsService } from '../services/create-financial_approval_limits.service';
import { UpdateFinancialApprovalLimitsService } from '../services/update-financial_approval_limits.service';
import { DeleteFinancialApprovalLimitsService } from '../services/delete-financial_approval_limits.service';

@Controller('financial-approval-limits')
@UseGuards(JwtAuthGuard)
export class FinancialApprovalLimitsController {
  constructor(
    private readonly findService: FindFinancialApprovalLimitsService,
    private readonly createService: CreateFinancialApprovalLimitsService,
    private readonly updateService: UpdateFinancialApprovalLimitsService,
    private readonly deleteService: DeleteFinancialApprovalLimitsService,
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
  async create(@Body() dto: CreateFinancialApprovalLimitsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialApprovalLimitsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
