import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceEntries } from '../entities/teacher_attendance_entries.entity';

@Injectable()
export class DeleteTeacherAttendanceEntriesService {
  constructor(
    @InjectRepository(TeacherAttendanceEntries)
    private readonly repository: Repository<TeacherAttendanceEntries>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
