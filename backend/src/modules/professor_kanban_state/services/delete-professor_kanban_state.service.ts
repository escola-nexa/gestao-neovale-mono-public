import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorKanbanState } from '../entities/professor_kanban_state.entity';

@Injectable()
export class DeleteProfessorKanbanStateService {
  constructor(
    @InjectRepository(ProfessorKanbanState)
    private readonly repository: Repository<ProfessorKanbanState>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
