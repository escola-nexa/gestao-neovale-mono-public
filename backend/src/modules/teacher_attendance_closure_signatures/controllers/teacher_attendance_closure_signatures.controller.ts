import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherAttendanceClosureSignaturesDto } from '../dto/create-teacher_attendance_closure_signatures.dto';
import { UpdateTeacherAttendanceClosureSignaturesDto } from '../dto/update-teacher_attendance_closure_signatures.dto';
import { FindTeacherAttendanceClosureSignaturesService } from '../services/find-teacher_attendance_closure_signatures.service';
import { CreateTeacherAttendanceClosureSignaturesService } from '../services/create-teacher_attendance_closure_signatures.service';
import { UpdateTeacherAttendanceClosureSignaturesService } from '../services/update-teacher_attendance_closure_signatures.service';
import { DeleteTeacherAttendanceClosureSignaturesService } from '../services/delete-teacher_attendance_closure_signatures.service';

@Controller('teacher-attendance-closure-signatures')
@UseGuards(JwtAuthGuard)
export class TeacherAttendanceClosureSignaturesController {
  constructor(
    private readonly findService: FindTeacherAttendanceClosureSignaturesService,
    private readonly createService: CreateTeacherAttendanceClosureSignaturesService,
    private readonly updateService: UpdateTeacherAttendanceClosureSignaturesService,
    private readonly deleteService: DeleteTeacherAttendanceClosureSignaturesService,
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
  async create(@Body() dto: CreateTeacherAttendanceClosureSignaturesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherAttendanceClosureSignaturesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
