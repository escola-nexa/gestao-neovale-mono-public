import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialEntriesDto } from '../dto/create-financial_entries.dto';
import { UpdateFinancialEntriesDto } from '../dto/update-financial_entries.dto';
import { FindFinancialEntriesService } from '../services/find-financial_entries.service';
import { CreateFinancialEntriesService } from '../services/create-financial_entries.service';
import { UpdateFinancialEntriesService } from '../services/update-financial_entries.service';
import { DeleteFinancialEntriesService } from '../services/delete-financial_entries.service';

@Controller('financial-entries')
@UseGuards(JwtAuthGuard)
export class FinancialEntriesController {
  constructor(
    private readonly findService: FindFinancialEntriesService,
    private readonly createService: CreateFinancialEntriesService,
    private readonly updateService: UpdateFinancialEntriesService,
    private readonly deleteService: DeleteFinancialEntriesService,
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
  async create(@Body() dto: CreateFinancialEntriesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialEntriesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
