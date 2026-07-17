import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSubjectsDto } from '../dto/create-subjects.dto';
import { UpdateSubjectsDto } from '../dto/update-subjects.dto';
import { FindSubjectsService } from '../services/find-subjects.service';
import { CreateSubjectsService } from '../services/create-subjects.service';
import { UpdateSubjectsService } from '../services/update-subjects.service';
import { DeleteSubjectsService } from '../services/delete-subjects.service';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(
    private readonly findService: FindSubjectsService,
    private readonly createService: CreateSubjectsService,
    private readonly updateService: UpdateSubjectsService,
    private readonly deleteService: DeleteSubjectsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Post('for-courses')
  async findForCourses(@Body() dto: { courseIds: string[] }, @CurrentUser() user: any) {
    return this.findService.findForCourses(dto.courseIds, user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateSubjectsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubjectsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
