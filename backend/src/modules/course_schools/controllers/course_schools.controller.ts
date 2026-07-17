import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateCourseSchoolsDto } from '../dto/create-course_schools.dto';
import { UpdateCourseSchoolsDto } from '../dto/update-course_schools.dto';
import { FindCourseSchoolsService } from '../services/find-course_schools.service';
import { CreateCourseSchoolsService } from '../services/create-course_schools.service';
import { UpdateCourseSchoolsService } from '../services/update-course_schools.service';
import { DeleteCourseSchoolsService } from '../services/delete-course_schools.service';

@Controller('course-schools')
@UseGuards(JwtAuthGuard)
export class CourseSchoolsController {
  constructor(
    private readonly findService: FindCourseSchoolsService,
    private readonly createService: CreateCourseSchoolsService,
    private readonly updateService: UpdateCourseSchoolsService,
    private readonly deleteService: DeleteCourseSchoolsService,
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
  async bulkDelete(@Body() dto: { courseIds: string[], schoolId: string }, @CurrentUser() user: any) {
    return this.deleteService.bulkDeleteBySchool(dto.courseIds, dto.schoolId, user.organizationId || user.id);
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
  async create(@Body() dto: CreateCourseSchoolsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCourseSchoolsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
