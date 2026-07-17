import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSubjectUcpOverrides } from '../entities/hr_subject_ucp_overrides.entity';
import { CreateHrSubjectUcpOverridesDto } from '../dto/create-hr_subject_ucp_overrides.dto';

@Injectable()
export class CreateHrSubjectUcpOverridesService {
  constructor(
    @InjectRepository(HrSubjectUcpOverrides)
    private readonly repository: Repository<HrSubjectUcpOverrides>,
  ) {}

  async execute(dto: CreateHrSubjectUcpOverridesDto, organizationId: string): Promise<HrSubjectUcpOverrides> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
