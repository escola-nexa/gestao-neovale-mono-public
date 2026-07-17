import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceEntries } from '../entities/teacher_attendance_entries.entity';
import { CreateTeacherAttendanceEntriesDto } from '../dto/create-teacher_attendance_entries.dto';

@Injectable()
export class CreateTeacherAttendanceEntriesService {
  constructor(
    @InjectRepository(TeacherAttendanceEntries)
    private readonly repository: Repository<TeacherAttendanceEntries>,
  ) {}

  async execute(dto: CreateTeacherAttendanceEntriesDto, organizationId: string): Promise<TeacherAttendanceEntries> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
