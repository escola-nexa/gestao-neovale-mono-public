import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialEntryAllocationsDto } from '../dto/create-financial_entry_allocations.dto';
import { UpdateFinancialEntryAllocationsDto } from '../dto/update-financial_entry_allocations.dto';
import { FindFinancialEntryAllocationsService } from '../services/find-financial_entry_allocations.service';
import { CreateFinancialEntryAllocationsService } from '../services/create-financial_entry_allocations.service';
import { UpdateFinancialEntryAllocationsService } from '../services/update-financial_entry_allocations.service';
import { DeleteFinancialEntryAllocationsService } from '../services/delete-financial_entry_allocations.service';

@Controller('financial-entry-allocations')
@UseGuards(JwtAuthGuard)
export class FinancialEntryAllocationsController {
  constructor(
    private readonly findService: FindFinancialEntryAllocationsService,
    private readonly createService: CreateFinancialEntryAllocationsService,
    private readonly updateService: UpdateFinancialEntryAllocationsService,
    private readonly deleteService: DeleteFinancialEntryAllocationsService,
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
  async create(@Body() dto: CreateFinancialEntryAllocationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialEntryAllocationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
