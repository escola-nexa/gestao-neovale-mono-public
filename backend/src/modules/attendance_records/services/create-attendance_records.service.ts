import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecords } from '../entities/attendance_records.entity';
import { CreateAttendanceRecordsDto } from '../dto/create-attendance_records.dto';

@Injectable()
export class CreateAttendanceRecordsService {
  constructor(
    @InjectRepository(AttendanceRecords)
    private readonly repository: Repository<AttendanceRecords>,
  ) {}

  async execute(dto: CreateAttendanceRecordsDto, organizationId: string): Promise<AttendanceRecords> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
