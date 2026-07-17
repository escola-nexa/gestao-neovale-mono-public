import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateStudentGradesDto } from '../dto/create-student_grades.dto';
import { UpdateStudentGradesDto } from '../dto/update-student_grades.dto';
import { FindStudentGradesService } from '../services/find-student_grades.service';
import { CreateStudentGradesService } from '../services/create-student_grades.service';
import { UpdateStudentGradesService } from '../services/update-student_grades.service';
import { DeleteStudentGradesService } from '../services/delete-student_grades.service';

@Controller('student-grades')
@UseGuards(JwtAuthGuard)
export class StudentGradesController {
  constructor(
    private readonly findService: FindStudentGradesService,
    private readonly createService: CreateStudentGradesService,
    private readonly updateService: UpdateStudentGradesService,
    private readonly deleteService: DeleteStudentGradesService,
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
  async create(@Body() dto: CreateStudentGradesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStudentGradesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
