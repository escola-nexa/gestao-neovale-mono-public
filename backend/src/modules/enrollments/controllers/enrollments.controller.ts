import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateEnrollmentsDto } from '../dto/create-enrollments.dto';
import { UpdateEnrollmentsDto } from '../dto/update-enrollments.dto';
import { FindEnrollmentsService } from '../services/find-enrollments.service';
import { CreateEnrollmentsService } from '../services/create-enrollments.service';
import { UpdateEnrollmentsService } from '../services/update-enrollments.service';
import { DeleteEnrollmentsService } from '../services/delete-enrollments.service';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(
    private readonly findService: FindEnrollmentsService,
    private readonly createService: CreateEnrollmentsService,
    private readonly updateService: UpdateEnrollmentsService,
    private readonly deleteService: DeleteEnrollmentsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Post('by-students')
  async findByStudents(@Body() dto: { studentIds: string[] }, @CurrentUser() user: any) {
    return this.findService.findByStudents(dto.studentIds, user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateEnrollmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEnrollmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
