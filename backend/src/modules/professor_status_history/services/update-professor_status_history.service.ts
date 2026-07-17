import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorStatusHistory } from '../entities/professor_status_history.entity';
import { UpdateProfessorStatusHistoryDto } from '../dto/update-professor_status_history.dto';

@Injectable()
export class UpdateProfessorStatusHistoryService {
  constructor(
    @InjectRepository(ProfessorStatusHistory)
    private readonly repository: Repository<ProfessorStatusHistory>,
  ) {}

  async execute(id: string, dto: UpdateProfessorStatusHistoryDto, organizationId: string): Promise<ProfessorStatusHistory> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
