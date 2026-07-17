import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionStatusHistory } from '../entities/substitution_status_history.entity';

@Injectable()
export class FindSubstitutionStatusHistoryService {
  constructor(
    @InjectRepository(SubstitutionStatusHistory)
    private readonly repository: Repository<SubstitutionStatusHistory>,
  ) {}

  async findAll(organizationId: string): Promise<SubstitutionStatusHistory[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SubstitutionStatusHistory | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
