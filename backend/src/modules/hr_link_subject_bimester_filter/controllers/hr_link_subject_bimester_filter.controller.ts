import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrLinkSubjectBimesterFilterDto } from '../dto/create-hr_link_subject_bimester_filter.dto';
import { UpdateHrLinkSubjectBimesterFilterDto } from '../dto/update-hr_link_subject_bimester_filter.dto';
import { FindHrLinkSubjectBimesterFilterService } from '../services/find-hr_link_subject_bimester_filter.service';
import { CreateHrLinkSubjectBimesterFilterService } from '../services/create-hr_link_subject_bimester_filter.service';
import { UpdateHrLinkSubjectBimesterFilterService } from '../services/update-hr_link_subject_bimester_filter.service';
import { DeleteHrLinkSubjectBimesterFilterService } from '../services/delete-hr_link_subject_bimester_filter.service';

@Controller('hr-link-subject-bimester-filter')
@UseGuards(JwtAuthGuard)
export class HrLinkSubjectBimesterFilterController {
  constructor(
    private readonly findService: FindHrLinkSubjectBimesterFilterService,
    private readonly createService: CreateHrLinkSubjectBimesterFilterService,
    private readonly updateService: UpdateHrLinkSubjectBimesterFilterService,
    private readonly deleteService: DeleteHrLinkSubjectBimesterFilterService,
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
  async create(@Body() dto: CreateHrLinkSubjectBimesterFilterDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrLinkSubjectBimesterFilterDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
