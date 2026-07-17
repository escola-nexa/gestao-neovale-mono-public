import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateBiQualityAuditResultsDto } from '../dto/create-bi_quality_audit_results.dto';
import { UpdateBiQualityAuditResultsDto } from '../dto/update-bi_quality_audit_results.dto';
import { FindBiQualityAuditResultsService } from '../services/find-bi_quality_audit_results.service';
import { CreateBiQualityAuditResultsService } from '../services/create-bi_quality_audit_results.service';
import { UpdateBiQualityAuditResultsService } from '../services/update-bi_quality_audit_results.service';
import { DeleteBiQualityAuditResultsService } from '../services/delete-bi_quality_audit_results.service';

@Controller('bi-quality-audit-results')
@UseGuards(JwtAuthGuard)
export class BiQualityAuditResultsController {
  constructor(
    private readonly findService: FindBiQualityAuditResultsService,
    private readonly createService: CreateBiQualityAuditResultsService,
    private readonly updateService: UpdateBiQualityAuditResultsService,
    private readonly deleteService: DeleteBiQualityAuditResultsService,
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
  async create(@Body() dto: CreateBiQualityAuditResultsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBiQualityAuditResultsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
