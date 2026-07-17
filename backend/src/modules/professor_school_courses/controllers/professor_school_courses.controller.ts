import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorSchoolCoursesDto } from '../dto/create-professor_school_courses.dto';
import { UpdateProfessorSchoolCoursesDto } from '../dto/update-professor_school_courses.dto';
import { FindProfessorSchoolCoursesService } from '../services/find-professor_school_courses.service';
import { CreateProfessorSchoolCoursesService } from '../services/create-professor_school_courses.service';
import { UpdateProfessorSchoolCoursesService } from '../services/update-professor_school_courses.service';
import { DeleteProfessorSchoolCoursesService } from '../services/delete-professor_school_courses.service';

@Controller('professor-school-courses')
@UseGuards(JwtAuthGuard)
export class ProfessorSchoolCoursesController {
  constructor(
    private readonly findService: FindProfessorSchoolCoursesService,
    private readonly createService: CreateProfessorSchoolCoursesService,
    private readonly updateService: UpdateProfessorSchoolCoursesService,
    private readonly deleteService: DeleteProfessorSchoolCoursesService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('schoolId') schoolId?: string) {
    return this.findService.findAll(user.organizationId || user.id, schoolId);
  }

  @Post('check-dependencies')
  async checkDependencies(@Body() payload: any, @CurrentUser() user: any) {
    return this.findService.checkDependencies(payload, user.organizationId || user.id);
  }

  @Post('bulk-delete')
  async bulkDelete(@Body() dto: { ids: string[] }, @CurrentUser() user: any) {
    return this.deleteService.bulkDelete(dto.ids, user.organizationId || user.id);
  }

  @Post('bulk')
  async bulkCreate(@Body() rows: any[], @CurrentUser() user: any) {
    return this.createService.bulkCreate(rows, user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateProfessorSchoolCoursesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorSchoolCoursesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
