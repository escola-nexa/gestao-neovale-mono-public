import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialCategoriesDto } from '../dto/create-financial_categories.dto';
import { UpdateFinancialCategoriesDto } from '../dto/update-financial_categories.dto';
import { FindFinancialCategoriesService } from '../services/find-financial_categories.service';
import { CreateFinancialCategoriesService } from '../services/create-financial_categories.service';
import { UpdateFinancialCategoriesService } from '../services/update-financial_categories.service';
import { DeleteFinancialCategoriesService } from '../services/delete-financial_categories.service';

@Controller('financial-categories')
@UseGuards(JwtAuthGuard)
export class FinancialCategoriesController {
  constructor(
    private readonly findService: FindFinancialCategoriesService,
    private readonly createService: CreateFinancialCategoriesService,
    private readonly updateService: UpdateFinancialCategoriesService,
    private readonly deleteService: DeleteFinancialCategoriesService,
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
  async create(@Body() dto: CreateFinancialCategoriesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialCategoriesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
