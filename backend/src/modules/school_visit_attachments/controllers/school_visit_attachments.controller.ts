import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSchoolVisitAttachmentsDto } from '../dto/create-school_visit_attachments.dto';
import { UpdateSchoolVisitAttachmentsDto } from '../dto/update-school_visit_attachments.dto';
import { FindSchoolVisitAttachmentsService } from '../services/find-school_visit_attachments.service';
import { CreateSchoolVisitAttachmentsService } from '../services/create-school_visit_attachments.service';
import { UpdateSchoolVisitAttachmentsService } from '../services/update-school_visit_attachments.service';
import { DeleteSchoolVisitAttachmentsService } from '../services/delete-school_visit_attachments.service';

@Controller('school-visit-attachments')
@UseGuards(JwtAuthGuard)
export class SchoolVisitAttachmentsController {
  constructor(
    private readonly findService: FindSchoolVisitAttachmentsService,
    private readonly createService: CreateSchoolVisitAttachmentsService,
    private readonly updateService: UpdateSchoolVisitAttachmentsService,
    private readonly deleteService: DeleteSchoolVisitAttachmentsService,
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
  async create(@Body() dto: CreateSchoolVisitAttachmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolVisitAttachmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
