import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSchoolTimeSlotsDto } from '../dto/create-school_time_slots.dto';
import { UpdateSchoolTimeSlotsDto } from '../dto/update-school_time_slots.dto';
import { FindSchoolTimeSlotsService } from '../services/find-school_time_slots.service';
import { CreateSchoolTimeSlotsService } from '../services/create-school_time_slots.service';
import { UpdateSchoolTimeSlotsService } from '../services/update-school_time_slots.service';
import { DeleteSchoolTimeSlotsService } from '../services/delete-school_time_slots.service';

@Controller('school-time-slots')
@UseGuards(JwtAuthGuard)
export class SchoolTimeSlotsController {
  constructor(
    private readonly findService: FindSchoolTimeSlotsService,
    private readonly createService: CreateSchoolTimeSlotsService,
    private readonly updateService: UpdateSchoolTimeSlotsService,
    private readonly deleteService: DeleteSchoolTimeSlotsService,
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
  async create(@Body() dto: CreateSchoolTimeSlotsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolTimeSlotsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
