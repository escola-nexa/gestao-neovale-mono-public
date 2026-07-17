import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentPoolCandidates } from '../entities/talent_pool_candidates.entity';

@Injectable()
export class FindTalentPoolCandidatesService {
  constructor(
    @InjectRepository(TalentPoolCandidates)
    private readonly repository: Repository<TalentPoolCandidates>,
  ) {}

  async findAll(organizationId: string): Promise<TalentPoolCandidates[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TalentPoolCandidates | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
