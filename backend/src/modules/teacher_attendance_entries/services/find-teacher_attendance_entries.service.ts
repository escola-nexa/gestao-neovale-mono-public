import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceEntries } from '../entities/teacher_attendance_entries.entity';

@Injectable()
export class FindTeacherAttendanceEntriesService {
  constructor(
    @InjectRepository(TeacherAttendanceEntries)
    private readonly repository: Repository<TeacherAttendanceEntries>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherAttendanceEntries[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherAttendanceEntries | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
