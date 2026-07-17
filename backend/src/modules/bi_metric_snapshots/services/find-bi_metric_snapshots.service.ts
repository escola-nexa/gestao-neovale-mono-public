import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiMetricSnapshots } from '../entities/bi_metric_snapshots.entity';

@Injectable()
export class FindBiMetricSnapshotsService {
  constructor(
    @InjectRepository(BiMetricSnapshots)
    private readonly repository: Repository<BiMetricSnapshots>,
  ) {}

  async findAll(organizationId: string): Promise<BiMetricSnapshots[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<BiMetricSnapshots | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
