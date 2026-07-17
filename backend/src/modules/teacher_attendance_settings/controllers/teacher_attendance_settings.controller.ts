import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherAttendanceSettingsDto } from '../dto/create-teacher_attendance_settings.dto';
import { UpdateTeacherAttendanceSettingsDto } from '../dto/update-teacher_attendance_settings.dto';
import { FindTeacherAttendanceSettingsService } from '../services/find-teacher_attendance_settings.service';
import { CreateTeacherAttendanceSettingsService } from '../services/create-teacher_attendance_settings.service';
import { UpdateTeacherAttendanceSettingsService } from '../services/update-teacher_attendance_settings.service';
import { DeleteTeacherAttendanceSettingsService } from '../services/delete-teacher_attendance_settings.service';

@Controller('teacher-attendance-settings')
@UseGuards(JwtAuthGuard)
export class TeacherAttendanceSettingsController {
  constructor(
    private readonly findService: FindTeacherAttendanceSettingsService,
    private readonly createService: CreateTeacherAttendanceSettingsService,
    private readonly updateService: UpdateTeacherAttendanceSettingsService,
    private readonly deleteService: DeleteTeacherAttendanceSettingsService,
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
  async create(@Body() dto: CreateTeacherAttendanceSettingsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherAttendanceSettingsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
