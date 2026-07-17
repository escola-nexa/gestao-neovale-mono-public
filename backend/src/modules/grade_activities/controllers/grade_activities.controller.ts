import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateGradeActivitiesDto } from '../dto/create-grade_activities.dto';
import { UpdateGradeActivitiesDto } from '../dto/update-grade_activities.dto';
import { FindGradeActivitiesService } from '../services/find-grade_activities.service';
import { CreateGradeActivitiesService } from '../services/create-grade_activities.service';
import { UpdateGradeActivitiesService } from '../services/update-grade_activities.service';
import { DeleteGradeActivitiesService } from '../services/delete-grade_activities.service';

@Controller('grade-activities')
@UseGuards(JwtAuthGuard)
export class GradeActivitiesController {
  constructor(
    private readonly findService: FindGradeActivitiesService,
    private readonly createService: CreateGradeActivitiesService,
    private readonly updateService: UpdateGradeActivitiesService,
    private readonly deleteService: DeleteGradeActivitiesService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateGradeActivitiesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGradeActivitiesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
