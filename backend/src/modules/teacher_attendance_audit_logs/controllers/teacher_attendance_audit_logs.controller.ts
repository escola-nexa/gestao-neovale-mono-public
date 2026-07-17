import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherAttendanceAuditLogsDto } from '../dto/create-teacher_attendance_audit_logs.dto';
import { UpdateTeacherAttendanceAuditLogsDto } from '../dto/update-teacher_attendance_audit_logs.dto';
import { FindTeacherAttendanceAuditLogsService } from '../services/find-teacher_attendance_audit_logs.service';
import { CreateTeacherAttendanceAuditLogsService } from '../services/create-teacher_attendance_audit_logs.service';
import { UpdateTeacherAttendanceAuditLogsService } from '../services/update-teacher_attendance_audit_logs.service';
import { DeleteTeacherAttendanceAuditLogsService } from '../services/delete-teacher_attendance_audit_logs.service';

@Controller('teacher-attendance-audit-logs')
@UseGuards(JwtAuthGuard)
export class TeacherAttendanceAuditLogsController {
  constructor(
    private readonly findService: FindTeacherAttendanceAuditLogsService,
    private readonly createService: CreateTeacherAttendanceAuditLogsService,
    private readonly updateService: UpdateTeacherAttendanceAuditLogsService,
    private readonly deleteService: DeleteTeacherAttendanceAuditLogsService,
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
  async create(@Body() dto: CreateTeacherAttendanceAuditLogsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherAttendanceAuditLogsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
