import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolTimeSlots } from '../entities/school_time_slots.entity';

@Injectable()
export class DeleteSchoolTimeSlotsService {
  constructor(
    @InjectRepository(SchoolTimeSlots)
    private readonly repository: Repository<SchoolTimeSlots>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
