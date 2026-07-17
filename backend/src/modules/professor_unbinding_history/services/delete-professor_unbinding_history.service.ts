import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorUnbindingHistory } from '../entities/professor_unbinding_history.entity';

@Injectable()
export class DeleteProfessorUnbindingHistoryService {
  constructor(
    @InjectRepository(ProfessorUnbindingHistory)
    private readonly repository: Repository<ProfessorUnbindingHistory>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
