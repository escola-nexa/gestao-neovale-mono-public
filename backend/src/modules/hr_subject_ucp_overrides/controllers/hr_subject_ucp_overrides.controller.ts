import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrSubjectUcpOverridesDto } from '../dto/create-hr_subject_ucp_overrides.dto';
import { UpdateHrSubjectUcpOverridesDto } from '../dto/update-hr_subject_ucp_overrides.dto';
import { FindHrSubjectUcpOverridesService } from '../services/find-hr_subject_ucp_overrides.service';
import { CreateHrSubjectUcpOverridesService } from '../services/create-hr_subject_ucp_overrides.service';
import { UpdateHrSubjectUcpOverridesService } from '../services/update-hr_subject_ucp_overrides.service';
import { DeleteHrSubjectUcpOverridesService } from '../services/delete-hr_subject_ucp_overrides.service';

@Controller('hr-subject-ucp-overrides')
@UseGuards(JwtAuthGuard)
export class HrSubjectUcpOverridesController {
  constructor(
    private readonly findService: FindHrSubjectUcpOverridesService,
    private readonly createService: CreateHrSubjectUcpOverridesService,
    private readonly updateService: UpdateHrSubjectUcpOverridesService,
    private readonly deleteService: DeleteHrSubjectUcpOverridesService,
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
  async create(@Body() dto: CreateHrSubjectUcpOverridesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrSubjectUcpOverridesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
