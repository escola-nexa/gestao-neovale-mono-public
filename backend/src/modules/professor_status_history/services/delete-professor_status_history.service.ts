import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorStatusHistory } from '../entities/professor_status_history.entity';

@Injectable()
export class DeleteProfessorStatusHistoryService {
  constructor(
    @InjectRepository(ProfessorStatusHistory)
    private readonly repository: Repository<ProfessorStatusHistory>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
