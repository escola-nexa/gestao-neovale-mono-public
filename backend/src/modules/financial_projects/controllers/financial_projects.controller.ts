import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialProjectsDto } from '../dto/create-financial_projects.dto';
import { UpdateFinancialProjectsDto } from '../dto/update-financial_projects.dto';
import { FindFinancialProjectsService } from '../services/find-financial_projects.service';
import { CreateFinancialProjectsService } from '../services/create-financial_projects.service';
import { UpdateFinancialProjectsService } from '../services/update-financial_projects.service';
import { DeleteFinancialProjectsService } from '../services/delete-financial_projects.service';

@Controller('financial-projects')
@UseGuards(JwtAuthGuard)
export class FinancialProjectsController {
  constructor(
    private readonly findService: FindFinancialProjectsService,
    private readonly createService: CreateFinancialProjectsService,
    private readonly updateService: UpdateFinancialProjectsService,
    private readonly deleteService: DeleteFinancialProjectsService,
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
  async create(@Body() dto: CreateFinancialProjectsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialProjectsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
