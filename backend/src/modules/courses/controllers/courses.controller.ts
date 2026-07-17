import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateCoursesDto } from '../dto/create-courses.dto';
import { UpdateCoursesDto } from '../dto/update-courses.dto';
import { FindCoursesService } from '../services/find-courses.service';
import { CreateCoursesService } from '../services/create-courses.service';
import { UpdateCoursesService } from '../services/update-courses.service';
import { DeleteCoursesService } from '../services/delete-courses.service';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(
    private readonly findService: FindCoursesService,
    private readonly createService: CreateCoursesService,
    private readonly updateService: UpdateCoursesService,
    private readonly deleteService: DeleteCoursesService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Post('enrollment-counts')
  async getEnrollmentCounts(@Body() dto: { courseIds: string[], schoolId: string }, @CurrentUser() user: any) {
    return this.findService.getEnrollmentCounts(dto.courseIds, dto.schoolId, user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateCoursesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCoursesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
