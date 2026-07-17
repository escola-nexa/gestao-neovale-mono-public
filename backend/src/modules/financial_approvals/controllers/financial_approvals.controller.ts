import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialApprovalsDto } from '../dto/create-financial_approvals.dto';
import { UpdateFinancialApprovalsDto } from '../dto/update-financial_approvals.dto';
import { FindFinancialApprovalsService } from '../services/find-financial_approvals.service';
import { CreateFinancialApprovalsService } from '../services/create-financial_approvals.service';
import { UpdateFinancialApprovalsService } from '../services/update-financial_approvals.service';
import { DeleteFinancialApprovalsService } from '../services/delete-financial_approvals.service';

@Controller('financial-approvals')
@UseGuards(JwtAuthGuard)
export class FinancialApprovalsController {
  constructor(
    private readonly findService: FindFinancialApprovalsService,
    private readonly createService: CreateFinancialApprovalsService,
    private readonly updateService: UpdateFinancialApprovalsService,
    private readonly deleteService: DeleteFinancialApprovalsService,
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
  async create(@Body() dto: CreateFinancialApprovalsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialApprovalsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
