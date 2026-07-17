import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringCandidates } from '../entities/hr_hiring_candidates.entity';
import { CreateHrHiringCandidatesDto } from '../dto/create-hr_hiring_candidates.dto';

@Injectable()
export class CreateHrHiringCandidatesService {
  constructor(
    @InjectRepository(HrHiringCandidates)
    private readonly repository: Repository<HrHiringCandidates>,
  ) {}

  async execute(dto: CreateHrHiringCandidatesDto, organizationId: string): Promise<HrHiringCandidates> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
