import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorContactLogs } from '../entities/professor_contact_logs.entity';

@Injectable()
export class FindProfessorContactLogsService {
  constructor(
    @InjectRepository(ProfessorContactLogs)
    private readonly repository: Repository<ProfessorContactLogs>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorContactLogs[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorContactLogs | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
