import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorUnbindingHistory } from '../entities/professor_unbinding_history.entity';
import { UpdateProfessorUnbindingHistoryDto } from '../dto/update-professor_unbinding_history.dto';

@Injectable()
export class UpdateProfessorUnbindingHistoryService {
  constructor(
    @InjectRepository(ProfessorUnbindingHistory)
    private readonly repository: Repository<ProfessorUnbindingHistory>,
  ) {}

  async execute(id: string, dto: UpdateProfessorUnbindingHistoryDto, organizationId: string): Promise<ProfessorUnbindingHistory> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
