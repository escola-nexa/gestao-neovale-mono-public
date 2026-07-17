import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getTeacherAttendanceKpis(params: any) {
    return { data: { total: 0, compliance: 100 } };
  }

  async getTeacherAttendanceBiReport(params: any) {
    return { data: [] };
  }

  async getTeacherAttendanceDailySeries(params: any) {
    return { data: [] };
  }

  async getTeacherSubstitutionsKpis(params: any) {
    return { data: { total: 0, cost: 0 } };
  }

  async getTeacherSubstitutionsBiReport(params: any) {
    return { data: [] };
  }

  async getAcompanhamentoStats() {
    return { data: { visits: 0, routes: 0 } };
  }

  async getAcademicDashboard(params: any) {
    return { data: { subjects: 0, completeness: 100 } };
  }
}
