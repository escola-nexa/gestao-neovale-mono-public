import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialDocumentTypesDto } from '../dto/create-financial_document_types.dto';
import { UpdateFinancialDocumentTypesDto } from '../dto/update-financial_document_types.dto';
import { FindFinancialDocumentTypesService } from '../services/find-financial_document_types.service';
import { CreateFinancialDocumentTypesService } from '../services/create-financial_document_types.service';
import { UpdateFinancialDocumentTypesService } from '../services/update-financial_document_types.service';
import { DeleteFinancialDocumentTypesService } from '../services/delete-financial_document_types.service';

@Controller('financial-document-types')
@UseGuards(JwtAuthGuard)
export class FinancialDocumentTypesController {
  constructor(
    private readonly findService: FindFinancialDocumentTypesService,
    private readonly createService: CreateFinancialDocumentTypesService,
    private readonly updateService: UpdateFinancialDocumentTypesService,
    private readonly deleteService: DeleteFinancialDocumentTypesService,
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
  async create(@Body() dto: CreateFinancialDocumentTypesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialDocumentTypesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
