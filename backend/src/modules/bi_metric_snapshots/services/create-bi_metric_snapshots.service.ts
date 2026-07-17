import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiMetricSnapshots } from '../entities/bi_metric_snapshots.entity';
import { CreateBiMetricSnapshotsDto } from '../dto/create-bi_metric_snapshots.dto';

@Injectable()
export class CreateBiMetricSnapshotsService {
  constructor(
    @InjectRepository(BiMetricSnapshots)
    private readonly repository: Repository<BiMetricSnapshots>,
  ) {}

  async execute(dto: CreateBiMetricSnapshotsDto, organizationId: string): Promise<BiMetricSnapshots> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
