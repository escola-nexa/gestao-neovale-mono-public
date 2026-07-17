import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorKanbanState } from '../entities/professor_kanban_state.entity';

@Injectable()
export class FindProfessorKanbanStateService {
  constructor(
    @InjectRepository(ProfessorKanbanState)
    private readonly repository: Repository<ProfessorKanbanState>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorKanbanState[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorKanbanState | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
