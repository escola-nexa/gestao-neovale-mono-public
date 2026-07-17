import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorMedicalReports } from '../entities/professor_medical_reports.entity';

@Injectable()
export class DeleteProfessorMedicalReportsService {
  constructor(
    @InjectRepository(ProfessorMedicalReports)
    private readonly repository: Repository<ProfessorMedicalReports>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
