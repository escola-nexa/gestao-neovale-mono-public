import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceEntries } from '../entities/teacher_attendance_entries.entity';
import { UpdateTeacherAttendanceEntriesDto } from '../dto/update-teacher_attendance_entries.dto';

@Injectable()
export class UpdateTeacherAttendanceEntriesService {
  constructor(
    @InjectRepository(TeacherAttendanceEntries)
    private readonly repository: Repository<TeacherAttendanceEntries>,
  ) {}

  async execute(id: string, dto: UpdateTeacherAttendanceEntriesDto, organizationId: string): Promise<TeacherAttendanceEntries> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
