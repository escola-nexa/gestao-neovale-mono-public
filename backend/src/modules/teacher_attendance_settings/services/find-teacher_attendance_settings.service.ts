import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceSettings } from '../entities/teacher_attendance_settings.entity';

@Injectable()
export class FindTeacherAttendanceSettingsService {
  constructor(
    @InjectRepository(TeacherAttendanceSettings)
    private readonly repository: Repository<TeacherAttendanceSettings>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherAttendanceSettings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherAttendanceSettings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
