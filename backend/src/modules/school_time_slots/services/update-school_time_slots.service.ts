import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolTimeSlots } from '../entities/school_time_slots.entity';
import { UpdateSchoolTimeSlotsDto } from '../dto/update-school_time_slots.dto';

@Injectable()
export class UpdateSchoolTimeSlotsService {
  constructor(
    @InjectRepository(SchoolTimeSlots)
    private readonly repository: Repository<SchoolTimeSlots>,
  ) {}

  async execute(id: string, dto: UpdateSchoolTimeSlotsDto, organizationId: string): Promise<SchoolTimeSlots> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
