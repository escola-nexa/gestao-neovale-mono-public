import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTeacherPlanningsDto } from '../dto/create-teacher_plannings.dto';
import { UpdateTeacherPlanningsDto } from '../dto/update-teacher_plannings.dto';
import { FindTeacherPlanningsService } from '../services/find-teacher_plannings.service';
import { CreateTeacherPlanningsService } from '../services/create-teacher_plannings.service';
import { UpdateTeacherPlanningsService } from '../services/update-teacher_plannings.service';
import { DeleteTeacherPlanningsService } from '../services/delete-teacher_plannings.service';

@Controller('teacher-plannings')
@UseGuards(JwtAuthGuard)
export class TeacherPlanningsController {
  constructor(
    private readonly findService: FindTeacherPlanningsService,
    private readonly createService: CreateTeacherPlanningsService,
    private readonly updateService: UpdateTeacherPlanningsService,
    private readonly deleteService: DeleteTeacherPlanningsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('professorId') professorId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('bimesterId') bimesterId?: string,
    @Query('status') status?: string,
  ) {
    return this.findService.findAll(user.organizationId || user.id, professorId, schoolId, bimesterId, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateTeacherPlanningsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherPlanningsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
