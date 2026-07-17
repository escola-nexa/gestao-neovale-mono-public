import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivitySummary } from '../entities/user_activity_summary.entity';

@Injectable()
export class DeleteUserActivitySummaryService {
  constructor(
    @InjectRepository(UserActivitySummary)
    private readonly repository: Repository<UserActivitySummary>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
