import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringCandidates } from '../entities/hr_hiring_candidates.entity';

@Injectable()
export class DeleteHrHiringCandidatesService {
  constructor(
    @InjectRepository(HrHiringCandidates)
    private readonly repository: Repository<HrHiringCandidates>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
