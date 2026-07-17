import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialAttachmentsDto } from '../dto/create-financial_attachments.dto';
import { UpdateFinancialAttachmentsDto } from '../dto/update-financial_attachments.dto';
import { FindFinancialAttachmentsService } from '../services/find-financial_attachments.service';
import { CreateFinancialAttachmentsService } from '../services/create-financial_attachments.service';
import { UpdateFinancialAttachmentsService } from '../services/update-financial_attachments.service';
import { DeleteFinancialAttachmentsService } from '../services/delete-financial_attachments.service';

@Controller('financial-attachments')
@UseGuards(JwtAuthGuard)
export class FinancialAttachmentsController {
  constructor(
    private readonly findService: FindFinancialAttachmentsService,
    private readonly createService: CreateFinancialAttachmentsService,
    private readonly updateService: UpdateFinancialAttachmentsService,
    private readonly deleteService: DeleteFinancialAttachmentsService,
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
  async create(@Body() dto: CreateFinancialAttachmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialAttachmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
