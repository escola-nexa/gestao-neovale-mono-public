import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialSourceLinksDto } from '../dto/create-financial_source_links.dto';
import { UpdateFinancialSourceLinksDto } from '../dto/update-financial_source_links.dto';
import { FindFinancialSourceLinksService } from '../services/find-financial_source_links.service';
import { CreateFinancialSourceLinksService } from '../services/create-financial_source_links.service';
import { UpdateFinancialSourceLinksService } from '../services/update-financial_source_links.service';
import { DeleteFinancialSourceLinksService } from '../services/delete-financial_source_links.service';

@Controller('financial-source-links')
@UseGuards(JwtAuthGuard)
export class FinancialSourceLinksController {
  constructor(
    private readonly findService: FindFinancialSourceLinksService,
    private readonly createService: CreateFinancialSourceLinksService,
    private readonly updateService: UpdateFinancialSourceLinksService,
    private readonly deleteService: DeleteFinancialSourceLinksService,
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
  async create(@Body() dto: CreateFinancialSourceLinksDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialSourceLinksDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
