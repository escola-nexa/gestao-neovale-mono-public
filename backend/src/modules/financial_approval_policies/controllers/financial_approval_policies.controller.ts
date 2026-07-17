import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialApprovalPoliciesDto } from '../dto/create-financial_approval_policies.dto';
import { UpdateFinancialApprovalPoliciesDto } from '../dto/update-financial_approval_policies.dto';
import { FindFinancialApprovalPoliciesService } from '../services/find-financial_approval_policies.service';
import { CreateFinancialApprovalPoliciesService } from '../services/create-financial_approval_policies.service';
import { UpdateFinancialApprovalPoliciesService } from '../services/update-financial_approval_policies.service';
import { DeleteFinancialApprovalPoliciesService } from '../services/delete-financial_approval_policies.service';

@Controller('financial-approval-policies')
@UseGuards(JwtAuthGuard)
export class FinancialApprovalPoliciesController {
  constructor(
    private readonly findService: FindFinancialApprovalPoliciesService,
    private readonly createService: CreateFinancialApprovalPoliciesService,
    private readonly updateService: UpdateFinancialApprovalPoliciesService,
    private readonly deleteService: DeleteFinancialApprovalPoliciesService,
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
  async create(@Body() dto: CreateFinancialApprovalPoliciesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialApprovalPoliciesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
