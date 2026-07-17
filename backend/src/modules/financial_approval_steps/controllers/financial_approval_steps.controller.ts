import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialApprovalStepsDto } from '../dto/create-financial_approval_steps.dto';
import { UpdateFinancialApprovalStepsDto } from '../dto/update-financial_approval_steps.dto';
import { FindFinancialApprovalStepsService } from '../services/find-financial_approval_steps.service';
import { CreateFinancialApprovalStepsService } from '../services/create-financial_approval_steps.service';
import { UpdateFinancialApprovalStepsService } from '../services/update-financial_approval_steps.service';
import { DeleteFinancialApprovalStepsService } from '../services/delete-financial_approval_steps.service';

@Controller('financial-approval-steps')
@UseGuards(JwtAuthGuard)
export class FinancialApprovalStepsController {
  constructor(
    private readonly findService: FindFinancialApprovalStepsService,
    private readonly createService: CreateFinancialApprovalStepsService,
    private readonly updateService: UpdateFinancialApprovalStepsService,
    private readonly deleteService: DeleteFinancialApprovalStepsService,
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
  async create(@Body() dto: CreateFinancialApprovalStepsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialApprovalStepsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
