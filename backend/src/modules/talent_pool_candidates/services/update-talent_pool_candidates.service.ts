import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentPoolCandidates } from '../entities/talent_pool_candidates.entity';
import { UpdateTalentPoolCandidatesDto } from '../dto/update-talent_pool_candidates.dto';

@Injectable()
export class UpdateTalentPoolCandidatesService {
  constructor(
    @InjectRepository(TalentPoolCandidates)
    private readonly repository: Repository<TalentPoolCandidates>,
  ) {}

  async execute(id: string, dto: UpdateTalentPoolCandidatesDto, organizationId: string): Promise<TalentPoolCandidates> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
