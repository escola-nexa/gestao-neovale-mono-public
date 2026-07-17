import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSchoolIndications } from '../entities/hr_school_indications.entity';

@Injectable()
export class DeleteHrSchoolIndicationsService {
  constructor(
    @InjectRepository(HrSchoolIndications)
    private readonly repository: Repository<HrSchoolIndications>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
