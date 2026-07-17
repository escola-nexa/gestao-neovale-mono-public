import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialClosureAuditDto } from '../dto/create-financial_closure_audit.dto';
import { UpdateFinancialClosureAuditDto } from '../dto/update-financial_closure_audit.dto';
import { FindFinancialClosureAuditService } from '../services/find-financial_closure_audit.service';
import { CreateFinancialClosureAuditService } from '../services/create-financial_closure_audit.service';
import { UpdateFinancialClosureAuditService } from '../services/update-financial_closure_audit.service';
import { DeleteFinancialClosureAuditService } from '../services/delete-financial_closure_audit.service';

@Controller('financial-closure-audit')
@UseGuards(JwtAuthGuard)
export class FinancialClosureAuditController {
  constructor(
    private readonly findService: FindFinancialClosureAuditService,
    private readonly createService: CreateFinancialClosureAuditService,
    private readonly updateService: UpdateFinancialClosureAuditService,
    private readonly deleteService: DeleteFinancialClosureAuditService,
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
  async create(@Body() dto: CreateFinancialClosureAuditDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialClosureAuditDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
