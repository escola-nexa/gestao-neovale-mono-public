import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorMedicalReports } from '../entities/professor_medical_reports.entity';
import { CreateProfessorMedicalReportsDto } from '../dto/create-professor_medical_reports.dto';

@Injectable()
export class CreateProfessorMedicalReportsService {
  constructor(
    @InjectRepository(ProfessorMedicalReports)
    private readonly repository: Repository<ProfessorMedicalReports>,
  ) {}

  async execute(dto: CreateProfessorMedicalReportsDto, organizationId: string): Promise<ProfessorMedicalReports> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
