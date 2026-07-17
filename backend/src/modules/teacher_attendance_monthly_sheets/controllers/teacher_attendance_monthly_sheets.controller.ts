import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherAttendanceMonthlySheetsDto } from '../dto/create-teacher_attendance_monthly_sheets.dto';
import { UpdateTeacherAttendanceMonthlySheetsDto } from '../dto/update-teacher_attendance_monthly_sheets.dto';
import { FindTeacherAttendanceMonthlySheetsService } from '../services/find-teacher_attendance_monthly_sheets.service';
import { CreateTeacherAttendanceMonthlySheetsService } from '../services/create-teacher_attendance_monthly_sheets.service';
import { UpdateTeacherAttendanceMonthlySheetsService } from '../services/update-teacher_attendance_monthly_sheets.service';
import { DeleteTeacherAttendanceMonthlySheetsService } from '../services/delete-teacher_attendance_monthly_sheets.service';

@Controller('teacher-attendance-monthly-sheets')
@UseGuards(JwtAuthGuard)
export class TeacherAttendanceMonthlySheetsController {
  constructor(
    private readonly findService: FindTeacherAttendanceMonthlySheetsService,
    private readonly createService: CreateTeacherAttendanceMonthlySheetsService,
    private readonly updateService: UpdateTeacherAttendanceMonthlySheetsService,
    private readonly deleteService: DeleteTeacherAttendanceMonthlySheetsService,
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
  async create(@Body() dto: CreateTeacherAttendanceMonthlySheetsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherAttendanceMonthlySheetsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
