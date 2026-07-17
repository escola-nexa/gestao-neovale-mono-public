import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivitySummary } from '../entities/user_activity_summary.entity';
import { UpdateUserActivitySummaryDto } from '../dto/update-user_activity_summary.dto';

@Injectable()
export class UpdateUserActivitySummaryService {
  constructor(
    @InjectRepository(UserActivitySummary)
    private readonly repository: Repository<UserActivitySummary>,
  ) {}

  async execute(id: string, dto: UpdateUserActivitySummaryDto, organizationId: string): Promise<UserActivitySummary> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
