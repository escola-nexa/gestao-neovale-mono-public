import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecords } from '../entities/attendance_records.entity';
import { UpdateAttendanceRecordsDto } from '../dto/update-attendance_records.dto';

@Injectable()
export class UpdateAttendanceRecordsService {
  constructor(
    @InjectRepository(AttendanceRecords)
    private readonly repository: Repository<AttendanceRecords>,
  ) {}

  async execute(id: string, dto: UpdateAttendanceRecordsDto, organizationId: string): Promise<AttendanceRecords> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
