import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateAcademicBimestersDto } from '../dto/create-academic_bimesters.dto';
import { UpdateAcademicBimestersDto } from '../dto/update-academic_bimesters.dto';
import { FindAcademicBimestersService } from '../services/find-academic_bimesters.service';
import { CreateAcademicBimestersService } from '../services/create-academic_bimesters.service';
import { UpdateAcademicBimestersService } from '../services/update-academic_bimesters.service';
import { DeleteAcademicBimestersService } from '../services/delete-academic_bimesters.service';

@Controller('academic-bimesters')
@UseGuards(JwtAuthGuard)
export class AcademicBimestersController {
  constructor(
    private readonly findService: FindAcademicBimestersService,
    private readonly createService: CreateAcademicBimestersService,
    private readonly updateService: UpdateAcademicBimestersService,
    private readonly deleteService: DeleteAcademicBimestersService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('calendarId') calendarId?: string) {
    return this.findService.findAll(user.organizationId || user.id, calendarId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateAcademicBimestersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAcademicBimestersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
