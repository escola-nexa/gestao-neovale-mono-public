import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolTimeSlots } from '../entities/school_time_slots.entity';
import { CreateSchoolTimeSlotsDto } from '../dto/create-school_time_slots.dto';

@Injectable()
export class CreateSchoolTimeSlotsService {
  constructor(
    @InjectRepository(SchoolTimeSlots)
    private readonly repository: Repository<SchoolTimeSlots>,
  ) {}

  async execute(dto: CreateSchoolTimeSlotsDto, organizationId: string): Promise<SchoolTimeSlots> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
