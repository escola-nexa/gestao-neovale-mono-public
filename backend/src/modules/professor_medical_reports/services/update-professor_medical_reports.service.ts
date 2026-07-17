import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorMedicalReports } from '../entities/professor_medical_reports.entity';
import { UpdateProfessorMedicalReportsDto } from '../dto/update-professor_medical_reports.dto';

@Injectable()
export class UpdateProfessorMedicalReportsService {
  constructor(
    @InjectRepository(ProfessorMedicalReports)
    private readonly repository: Repository<ProfessorMedicalReports>,
  ) {}

  async execute(id: string, dto: UpdateProfessorMedicalReportsDto, organizationId: string): Promise<ProfessorMedicalReports> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
