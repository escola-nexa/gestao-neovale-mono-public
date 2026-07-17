import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionStatusHistory } from '../entities/substitution_status_history.entity';

@Injectable()
export class DeleteSubstitutionStatusHistoryService {
  constructor(
    @InjectRepository(SubstitutionStatusHistory)
    private readonly repository: Repository<SubstitutionStatusHistory>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
