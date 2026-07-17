import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSubjectUcpOverrides } from '../entities/hr_subject_ucp_overrides.entity';

@Injectable()
export class DeleteHrSubjectUcpOverridesService {
  constructor(
    @InjectRepository(HrSubjectUcpOverrides)
    private readonly repository: Repository<HrSubjectUcpOverrides>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
