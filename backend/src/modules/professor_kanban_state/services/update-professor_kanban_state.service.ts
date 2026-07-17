import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorKanbanState } from '../entities/professor_kanban_state.entity';
import { UpdateProfessorKanbanStateDto } from '../dto/update-professor_kanban_state.dto';

@Injectable()
export class UpdateProfessorKanbanStateService {
  constructor(
    @InjectRepository(ProfessorKanbanState)
    private readonly repository: Repository<ProfessorKanbanState>,
  ) {}

  async execute(id: string, dto: UpdateProfessorKanbanStateDto, organizationId: string): Promise<ProfessorKanbanState> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
