import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorKanbanLabels } from '../entities/professor_kanban_labels.entity';
import { UpdateProfessorKanbanLabelsDto } from '../dto/update-professor_kanban_labels.dto';

@Injectable()
export class UpdateProfessorKanbanLabelsService {
  constructor(
    @InjectRepository(ProfessorKanbanLabels)
    private readonly repository: Repository<ProfessorKanbanLabels>,
  ) {}

  async execute(id: string, dto: UpdateProfessorKanbanLabelsDto, organizationId: string): Promise<ProfessorKanbanLabels> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
