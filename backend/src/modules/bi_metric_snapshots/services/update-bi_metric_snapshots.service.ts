import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiMetricSnapshots } from '../entities/bi_metric_snapshots.entity';
import { UpdateBiMetricSnapshotsDto } from '../dto/update-bi_metric_snapshots.dto';

@Injectable()
export class UpdateBiMetricSnapshotsService {
  constructor(
    @InjectRepository(BiMetricSnapshots)
    private readonly repository: Repository<BiMetricSnapshots>,
  ) {}

  async execute(id: string, dto: UpdateBiMetricSnapshotsDto, organizationId: string): Promise<BiMetricSnapshots> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
