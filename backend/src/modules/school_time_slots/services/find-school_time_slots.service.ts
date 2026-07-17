import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolTimeSlots } from '../entities/school_time_slots.entity';

@Injectable()
export class FindSchoolTimeSlotsService {
  constructor(
    @InjectRepository(SchoolTimeSlots)
    private readonly repository: Repository<SchoolTimeSlots>,
  ) {}

  async findAll(organizationId: string): Promise<SchoolTimeSlots[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SchoolTimeSlots | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
