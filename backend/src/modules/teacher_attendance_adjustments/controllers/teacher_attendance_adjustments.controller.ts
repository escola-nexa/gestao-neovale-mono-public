import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherAttendanceAdjustmentsDto } from '../dto/create-teacher_attendance_adjustments.dto';
import { UpdateTeacherAttendanceAdjustmentsDto } from '../dto/update-teacher_attendance_adjustments.dto';
import { FindTeacherAttendanceAdjustmentsService } from '../services/find-teacher_attendance_adjustments.service';
import { CreateTeacherAttendanceAdjustmentsService } from '../services/create-teacher_attendance_adjustments.service';
import { UpdateTeacherAttendanceAdjustmentsService } from '../services/update-teacher_attendance_adjustments.service';
import { DeleteTeacherAttendanceAdjustmentsService } from '../services/delete-teacher_attendance_adjustments.service';

@Controller('teacher-attendance-adjustments')
@UseGuards(JwtAuthGuard)
export class TeacherAttendanceAdjustmentsController {
  constructor(
    private readonly findService: FindTeacherAttendanceAdjustmentsService,
    private readonly createService: CreateTeacherAttendanceAdjustmentsService,
    private readonly updateService: UpdateTeacherAttendanceAdjustmentsService,
    private readonly deleteService: DeleteTeacherAttendanceAdjustmentsService,
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
  async create(@Body() dto: CreateTeacherAttendanceAdjustmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherAttendanceAdjustmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
