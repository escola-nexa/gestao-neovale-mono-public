import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorUnbindingHistory } from '../entities/professor_unbinding_history.entity';
import { CreateProfessorUnbindingHistoryDto } from '../dto/create-professor_unbinding_history.dto';

@Injectable()
export class CreateProfessorUnbindingHistoryService {
  constructor(
    @InjectRepository(ProfessorUnbindingHistory)
    private readonly repository: Repository<ProfessorUnbindingHistory>,
  ) {}

  async execute(dto: CreateProfessorUnbindingHistoryDto, organizationId: string): Promise<ProfessorUnbindingHistory> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
