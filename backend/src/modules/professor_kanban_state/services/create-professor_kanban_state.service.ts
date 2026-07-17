import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorKanbanState } from '../entities/professor_kanban_state.entity';
import { CreateProfessorKanbanStateDto } from '../dto/create-professor_kanban_state.dto';

@Injectable()
export class CreateProfessorKanbanStateService {
  constructor(
    @InjectRepository(ProfessorKanbanState)
    private readonly repository: Repository<ProfessorKanbanState>,
  ) {}

  async execute(dto: CreateProfessorKanbanStateDto, organizationId: string): Promise<ProfessorKanbanState> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
