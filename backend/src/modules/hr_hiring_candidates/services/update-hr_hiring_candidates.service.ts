import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringCandidates } from '../entities/hr_hiring_candidates.entity';
import { UpdateHrHiringCandidatesDto } from '../dto/update-hr_hiring_candidates.dto';

@Injectable()
export class UpdateHrHiringCandidatesService {
  constructor(
    @InjectRepository(HrHiringCandidates)
    private readonly repository: Repository<HrHiringCandidates>,
  ) {}

  async execute(id: string, dto: UpdateHrHiringCandidatesDto, organizationId: string): Promise<HrHiringCandidates> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
