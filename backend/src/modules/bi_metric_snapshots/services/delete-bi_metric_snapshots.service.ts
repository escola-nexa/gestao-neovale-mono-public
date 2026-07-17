import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiMetricSnapshots } from '../entities/bi_metric_snapshots.entity';

@Injectable()
export class DeleteBiMetricSnapshotsService {
  constructor(
    @InjectRepository(BiMetricSnapshots)
    private readonly repository: Repository<BiMetricSnapshots>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
