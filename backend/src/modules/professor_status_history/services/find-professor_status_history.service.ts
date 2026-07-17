import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorStatusHistory } from '../entities/professor_status_history.entity';

@Injectable()
export class FindProfessorStatusHistoryService {
  constructor(
    @InjectRepository(ProfessorStatusHistory)
    private readonly repository: Repository<ProfessorStatusHistory>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorStatusHistory[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorStatusHistory | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
