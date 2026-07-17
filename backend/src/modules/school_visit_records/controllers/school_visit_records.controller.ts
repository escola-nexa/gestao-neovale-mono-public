import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSchoolVisitRecordsDto } from '../dto/create-school_visit_records.dto';
import { UpdateSchoolVisitRecordsDto } from '../dto/update-school_visit_records.dto';
import { FindSchoolVisitRecordsService } from '../services/find-school_visit_records.service';
import { CreateSchoolVisitRecordsService } from '../services/create-school_visit_records.service';
import { UpdateSchoolVisitRecordsService } from '../services/update-school_visit_records.service';
import { DeleteSchoolVisitRecordsService } from '../services/delete-school_visit_records.service';

@Controller('school-visit-records')
@UseGuards(JwtAuthGuard)
export class SchoolVisitRecordsController {
  constructor(
    private readonly findService: FindSchoolVisitRecordsService,
    private readonly createService: CreateSchoolVisitRecordsService,
    private readonly updateService: UpdateSchoolVisitRecordsService,
    private readonly deleteService: DeleteSchoolVisitRecordsService,
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
  async create(@Body() dto: CreateSchoolVisitRecordsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolVisitRecordsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
