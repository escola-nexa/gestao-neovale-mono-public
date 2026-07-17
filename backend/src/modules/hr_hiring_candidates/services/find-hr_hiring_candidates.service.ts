import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringCandidates } from '../entities/hr_hiring_candidates.entity';

@Injectable()
export class FindHrHiringCandidatesService {
  constructor(
    @InjectRepository(HrHiringCandidates)
    private readonly repository: Repository<HrHiringCandidates>,
  ) {}

  async findAll(organizationId: string): Promise<HrHiringCandidates[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrHiringCandidates | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
