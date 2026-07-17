import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivitySummary } from '../entities/user_activity_summary.entity';
import { CreateUserActivitySummaryDto } from '../dto/create-user_activity_summary.dto';

@Injectable()
export class CreateUserActivitySummaryService {
  constructor(
    @InjectRepository(UserActivitySummary)
    private readonly repository: Repository<UserActivitySummary>,
  ) {}

  async execute(dto: CreateUserActivitySummaryDto, organizationId: string): Promise<UserActivitySummary> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
