import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorMedicalReportsDto } from '../dto/create-professor_medical_reports.dto';
import { UpdateProfessorMedicalReportsDto } from '../dto/update-professor_medical_reports.dto';
import { FindProfessorMedicalReportsService } from '../services/find-professor_medical_reports.service';
import { CreateProfessorMedicalReportsService } from '../services/create-professor_medical_reports.service';
import { UpdateProfessorMedicalReportsService } from '../services/update-professor_medical_reports.service';
import { DeleteProfessorMedicalReportsService } from '../services/delete-professor_medical_reports.service';

@Controller('professor-medical-reports')
@UseGuards(JwtAuthGuard)
export class ProfessorMedicalReportsController {
  constructor(
    private readonly findService: FindProfessorMedicalReportsService,
    private readonly createService: CreateProfessorMedicalReportsService,
    private readonly updateService: UpdateProfessorMedicalReportsService,
    private readonly deleteService: DeleteProfessorMedicalReportsService,
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
  async create(@Body() dto: CreateProfessorMedicalReportsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorMedicalReportsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
