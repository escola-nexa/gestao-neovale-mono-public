import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivitySummary } from '../entities/user_activity_summary.entity';

@Injectable()
export class FindUserActivitySummaryService {
  constructor(
    @InjectRepository(UserActivitySummary)
    private readonly repository: Repository<UserActivitySummary>,
  ) {}

  async findAll(organizationId: string): Promise<UserActivitySummary[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<UserActivitySummary | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
