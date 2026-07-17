import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherAttendanceEntriesDto } from '../dto/create-teacher_attendance_entries.dto';
import { UpdateTeacherAttendanceEntriesDto } from '../dto/update-teacher_attendance_entries.dto';
import { FindTeacherAttendanceEntriesService } from '../services/find-teacher_attendance_entries.service';
import { CreateTeacherAttendanceEntriesService } from '../services/create-teacher_attendance_entries.service';
import { UpdateTeacherAttendanceEntriesService } from '../services/update-teacher_attendance_entries.service';
import { DeleteTeacherAttendanceEntriesService } from '../services/delete-teacher_attendance_entries.service';

@Controller('teacher-attendance-entries')
@UseGuards(JwtAuthGuard)
export class TeacherAttendanceEntriesController {
  constructor(
    private readonly findService: FindTeacherAttendanceEntriesService,
    private readonly createService: CreateTeacherAttendanceEntriesService,
    private readonly updateService: UpdateTeacherAttendanceEntriesService,
    private readonly deleteService: DeleteTeacherAttendanceEntriesService,
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
  async create(@Body() dto: CreateTeacherAttendanceEntriesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherAttendanceEntriesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
