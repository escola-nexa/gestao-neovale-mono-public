import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentPoolCandidates } from '../entities/talent_pool_candidates.entity';

@Injectable()
export class DeleteTalentPoolCandidatesService {
  constructor(
    @InjectRepository(TalentPoolCandidates)
    private readonly repository: Repository<TalentPoolCandidates>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
