import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { FrequenciaService } from '../services/frequencia.service';

@Controller('frequencia')
@UseGuards(JwtAuthGuard)
export class FrequenciaController {
  constructor(private readonly frequenciaService: FrequenciaService) {}

  @Get('today-classes')
  async getTodayClasses(@Query() query: any) {
    return this.frequenciaService.getTodayClasses(query);
  }

  @Get('records')
  async fetchRecords(@Query() query: any) {
    return this.frequenciaService.fetchRecords(query);
  }

  @Post('records')
  async upsertRecord(@Body() body: any) {
    return this.frequenciaService.upsertRecord(body);
  }

  @Delete('records')
  async deleteRecord(@Body() body: any) {
    return this.frequenciaService.deleteRecord(body);
  }

  @Get('alerts')
  async getAbsenceAlerts(@Query() query: any) {
    return this.frequenciaService.getAbsenceAlerts(query);
  }

  @Get('alerts/school')
  async getSchoolAbsenceAlerts(@Query() query: any) {
    return this.frequenciaService.getSchoolAbsenceAlerts(query);
  }

  @Get('dashboard-classes')
  async getClassesForDashboard(@Query() query: any) {
    return this.frequenciaService.getClassesForDashboard(query);
  }

  @Get('time-slots')
  async getTimeSlots(@Query() query: any) {
    return this.frequenciaService.getTimeSlots(query);
  }

  @Get('students')
  async getStudents(@Query() query: any) {
    return this.frequenciaService.getStudents(query);
  }
}
