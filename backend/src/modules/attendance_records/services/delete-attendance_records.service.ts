import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecords } from '../entities/attendance_records.entity';

@Injectable()
export class DeleteAttendanceRecordsService {
  constructor(
    @InjectRepository(AttendanceRecords)
    private readonly repository: Repository<AttendanceRecords>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
