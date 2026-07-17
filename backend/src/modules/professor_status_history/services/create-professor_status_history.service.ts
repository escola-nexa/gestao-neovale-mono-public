import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorStatusHistory } from '../entities/professor_status_history.entity';
import { CreateProfessorStatusHistoryDto } from '../dto/create-professor_status_history.dto';

@Injectable()
export class CreateProfessorStatusHistoryService {
  constructor(
    @InjectRepository(ProfessorStatusHistory)
    private readonly repository: Repository<ProfessorStatusHistory>,
  ) {}

  async execute(dto: CreateProfessorStatusHistoryDto, organizationId: string): Promise<ProfessorStatusHistory> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
