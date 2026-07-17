import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialImportBatchesDto } from '../dto/create-financial_import_batches.dto';
import { UpdateFinancialImportBatchesDto } from '../dto/update-financial_import_batches.dto';
import { FindFinancialImportBatchesService } from '../services/find-financial_import_batches.service';
import { CreateFinancialImportBatchesService } from '../services/create-financial_import_batches.service';
import { UpdateFinancialImportBatchesService } from '../services/update-financial_import_batches.service';
import { DeleteFinancialImportBatchesService } from '../services/delete-financial_import_batches.service';

@Controller('financial-import-batches')
@UseGuards(JwtAuthGuard)
export class FinancialImportBatchesController {
  constructor(
    private readonly findService: FindFinancialImportBatchesService,
    private readonly createService: CreateFinancialImportBatchesService,
    private readonly updateService: UpdateFinancialImportBatchesService,
    private readonly deleteService: DeleteFinancialImportBatchesService,
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
  async create(@Body() dto: CreateFinancialImportBatchesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialImportBatchesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
