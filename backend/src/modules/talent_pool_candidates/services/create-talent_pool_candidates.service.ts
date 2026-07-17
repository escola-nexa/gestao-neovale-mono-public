import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentPoolCandidates } from '../entities/talent_pool_candidates.entity';
import { CreateTalentPoolCandidatesDto } from '../dto/create-talent_pool_candidates.dto';

@Injectable()
export class CreateTalentPoolCandidatesService {
  constructor(
    @InjectRepository(TalentPoolCandidates)
    private readonly repository: Repository<TalentPoolCandidates>,
  ) {}

  async execute(dto: CreateTalentPoolCandidatesDto, organizationId: string): Promise<TalentPoolCandidates> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
