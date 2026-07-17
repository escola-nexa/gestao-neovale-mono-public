import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSubjectUcpOverrides } from '../entities/hr_subject_ucp_overrides.entity';
import { UpdateHrSubjectUcpOverridesDto } from '../dto/update-hr_subject_ucp_overrides.dto';

@Injectable()
export class UpdateHrSubjectUcpOverridesService {
  constructor(
    @InjectRepository(HrSubjectUcpOverrides)
    private readonly repository: Repository<HrSubjectUcpOverrides>,
  ) {}

  async execute(id: string, dto: UpdateHrSubjectUcpOverridesDto, organizationId: string): Promise<HrSubjectUcpOverrides> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
