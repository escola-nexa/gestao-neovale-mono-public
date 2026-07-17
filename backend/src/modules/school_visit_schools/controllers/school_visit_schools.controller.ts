import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSchoolVisitSchoolsDto } from '../dto/create-school_visit_schools.dto';
import { UpdateSchoolVisitSchoolsDto } from '../dto/update-school_visit_schools.dto';
import { FindSchoolVisitSchoolsService } from '../services/find-school_visit_schools.service';
import { CreateSchoolVisitSchoolsService } from '../services/create-school_visit_schools.service';
import { UpdateSchoolVisitSchoolsService } from '../services/update-school_visit_schools.service';
import { DeleteSchoolVisitSchoolsService } from '../services/delete-school_visit_schools.service';

@Controller('school-visit-schools')
@UseGuards(JwtAuthGuard)
export class SchoolVisitSchoolsController {
  constructor(
    private readonly findService: FindSchoolVisitSchoolsService,
    private readonly createService: CreateSchoolVisitSchoolsService,
    private readonly updateService: UpdateSchoolVisitSchoolsService,
    private readonly deleteService: DeleteSchoolVisitSchoolsService,
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
  async create(@Body() dto: CreateSchoolVisitSchoolsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolVisitSchoolsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
