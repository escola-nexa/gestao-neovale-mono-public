import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorKanbanLabels } from '../entities/professor_kanban_labels.entity';

@Injectable()
export class FindProfessorKanbanLabelsService {
  constructor(
    @InjectRepository(ProfessorKanbanLabels)
    private readonly repository: Repository<ProfessorKanbanLabels>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorKanbanLabels[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorKanbanLabels | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
