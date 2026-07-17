import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSchoolVisitsDto } from '../dto/create-school_visits.dto';
import { UpdateSchoolVisitsDto } from '../dto/update-school_visits.dto';
import { FindSchoolVisitsService } from '../services/find-school_visits.service';
import { CreateSchoolVisitsService } from '../services/create-school_visits.service';
import { UpdateSchoolVisitsService } from '../services/update-school_visits.service';
import { DeleteSchoolVisitsService } from '../services/delete-school_visits.service';

@Controller('school-visits')
@UseGuards(JwtAuthGuard)
export class SchoolVisitsController {
  constructor(
    private readonly findService: FindSchoolVisitsService,
    private readonly createService: CreateSchoolVisitsService,
    private readonly updateService: UpdateSchoolVisitsService,
    private readonly deleteService: DeleteSchoolVisitsService,
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
  async create(@Body() dto: CreateSchoolVisitsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolVisitsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
