import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecords } from '../entities/attendance_records.entity';

@Injectable()
export class FindAttendanceRecordsService {
  constructor(
    @InjectRepository(AttendanceRecords)
    private readonly repository: Repository<AttendanceRecords>,
  ) {}

  async findAll(organizationId: string): Promise<AttendanceRecords[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<AttendanceRecords | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
