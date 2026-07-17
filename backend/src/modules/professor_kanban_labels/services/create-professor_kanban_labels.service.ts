import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorKanbanLabels } from '../entities/professor_kanban_labels.entity';
import { CreateProfessorKanbanLabelsDto } from '../dto/create-professor_kanban_labels.dto';

@Injectable()
export class CreateProfessorKanbanLabelsService {
  constructor(
    @InjectRepository(ProfessorKanbanLabels)
    private readonly repository: Repository<ProfessorKanbanLabels>,
  ) {}

  async execute(dto: CreateProfessorKanbanLabelsDto, organizationId: string): Promise<ProfessorKanbanLabels> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
