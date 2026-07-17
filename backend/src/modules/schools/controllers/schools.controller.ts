import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { FindSchoolsService } from '../services/find-schools.service';
import { CreateSchoolService } from '../services/create-school.service';
import { UpdateSchoolService } from '../services/update-school.service';
import { DeleteSchoolService } from '../services/delete-school.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { Schools } from '../entities/schools.entity';

@Controller('schools')
@UseGuards(JwtAuthGuard)
export class SchoolsController {
  constructor(
    private readonly findSchoolsService: FindSchoolsService,
    private readonly createSchoolService: CreateSchoolService,
    private readonly updateSchoolService: UpdateSchoolService,
    private readonly deleteSchoolService: DeleteSchoolService,
  ) { }

  @Get()
  async findAll(@CurrentUser() user: any, @Query('status') status?: string): Promise<Schools[]> {
    console.log('[SchoolsController] findAll invoked by user:', user);
    const data = await this.findSchoolsService.findAll(user.organizationId || user.id, status);
    console.log('[SchoolsController] returning data count:', data?.length);
    return data;
  }

  @Get(':id/name')
  async getName(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findSchoolsService.getName(id, user.organizationId || user.id);
  }

  @Get(':id/counts')
  async getCounts(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findSchoolsService.getCounts(id, user.organizationId || user.id);
  }

  @Get(':id/subject-counts')
  async getSubjectCounts(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findSchoolsService.getSubjectCounts(id, user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findSchoolsService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateSchoolDto, @CurrentUser() user: any) {
    return this.createSchoolService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.updateSchoolService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteSchoolService.execute(id, user.organizationId || user.id);
  }
}
