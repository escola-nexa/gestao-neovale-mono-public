import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorMedicalReports } from '../entities/professor_medical_reports.entity';

@Injectable()
export class FindProfessorMedicalReportsService {
  constructor(
    @InjectRepository(ProfessorMedicalReports)
    private readonly repository: Repository<ProfessorMedicalReports>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorMedicalReports[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorMedicalReports | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
