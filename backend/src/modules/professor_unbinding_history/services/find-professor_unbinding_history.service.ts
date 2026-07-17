import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorUnbindingHistory } from '../entities/professor_unbinding_history.entity';

@Injectable()
export class FindProfessorUnbindingHistoryService {
  constructor(
    @InjectRepository(ProfessorUnbindingHistory)
    private readonly repository: Repository<ProfessorUnbindingHistory>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorUnbindingHistory[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorUnbindingHistory | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
