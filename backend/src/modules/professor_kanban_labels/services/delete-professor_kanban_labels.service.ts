import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorKanbanLabels } from '../entities/professor_kanban_labels.entity';

@Injectable()
export class DeleteProfessorKanbanLabelsService {
  constructor(
    @InjectRepository(ProfessorKanbanLabels)
    private readonly repository: Repository<ProfessorKanbanLabels>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
