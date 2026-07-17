import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { DashboardService } from '../services/dashboard.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class DashboardBiController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('teacher-attendance/kpis')
  async getTeacherAttendanceKpis(@Query() query: any) {
    return this.dashboardService.getTeacherAttendanceKpis(query);
  }

  @Get('teacher-attendance/bi-report')
  async getTeacherAttendanceBiReport(@Query() query: any) {
    return this.dashboardService.getTeacherAttendanceBiReport(query);
  }

  @Get('teacher-attendance/daily-series')
  async getTeacherAttendanceDailySeries(@Query() query: any) {
    return this.dashboardService.getTeacherAttendanceDailySeries(query);
  }

  @Post('teacher-substitutions/dashboard/kpis')
  async getTeacherSubstitutionsKpis(@Body() body: any) {
    return this.dashboardService.getTeacherSubstitutionsKpis(body);
  }

  @Post('teacher-substitutions/bi-report')
  async getTeacherSubstitutionsBiReport(@Body() body: any) {
    return this.dashboardService.getTeacherSubstitutionsBiReport(body);
  }

  @Get('acompanhamento/dashboard-stats')
  async getAcompanhamentoStats() {
    return this.dashboardService.getAcompanhamentoStats();
  }

  @Get('academic/disciplinas/dashboard')
  async getAcademicDashboard(@Query() query: any) {
    return this.dashboardService.getAcademicDashboard(query);
  }
}
