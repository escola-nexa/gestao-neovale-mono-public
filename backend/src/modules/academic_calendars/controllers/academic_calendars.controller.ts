import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateAcademicCalendarsDto } from '../dto/create-academic_calendars.dto';
import { UpdateAcademicCalendarsDto } from '../dto/update-academic_calendars.dto';
import { FindAcademicCalendarsService } from '../services/find-academic_calendars.service';
import { CreateAcademicCalendarsService } from '../services/create-academic_calendars.service';
import { UpdateAcademicCalendarsService } from '../services/update-academic_calendars.service';
import { DeleteAcademicCalendarsService } from '../services/delete-academic_calendars.service';

@Controller('academic-calendars')
@UseGuards(JwtAuthGuard)
export class AcademicCalendarsController {
  constructor(
    private readonly findService: FindAcademicCalendarsService,
    private readonly createService: CreateAcademicCalendarsService,
    private readonly updateService: UpdateAcademicCalendarsService,
    private readonly deleteService: DeleteAcademicCalendarsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.findService.findAll(user.organizationId || user.id, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateAcademicCalendarsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAcademicCalendarsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
