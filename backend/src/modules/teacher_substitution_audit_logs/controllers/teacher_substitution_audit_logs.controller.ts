import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherSubstitutionAuditLogsDto } from '../dto/create-teacher_substitution_audit_logs.dto';
import { UpdateTeacherSubstitutionAuditLogsDto } from '../dto/update-teacher_substitution_audit_logs.dto';
import { FindTeacherSubstitutionAuditLogsService } from '../services/find-teacher_substitution_audit_logs.service';
import { CreateTeacherSubstitutionAuditLogsService } from '../services/create-teacher_substitution_audit_logs.service';
import { UpdateTeacherSubstitutionAuditLogsService } from '../services/update-teacher_substitution_audit_logs.service';
import { DeleteTeacherSubstitutionAuditLogsService } from '../services/delete-teacher_substitution_audit_logs.service';

@Controller('teacher-substitution-audit-logs')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionAuditLogsController {
  constructor(
    private readonly findService: FindTeacherSubstitutionAuditLogsService,
    private readonly createService: CreateTeacherSubstitutionAuditLogsService,
    private readonly updateService: UpdateTeacherSubstitutionAuditLogsService,
    private readonly deleteService: DeleteTeacherSubstitutionAuditLogsService,
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
  async create(@Body() dto: CreateTeacherSubstitutionAuditLogsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherSubstitutionAuditLogsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
