import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceSettings } from '../entities/teacher_attendance_settings.entity';
import { CreateTeacherAttendanceSettingsDto } from '../dto/create-teacher_attendance_settings.dto';

@Injectable()
export class CreateTeacherAttendanceSettingsService {
  constructor(
    @InjectRepository(TeacherAttendanceSettings)
    private readonly repository: Repository<TeacherAttendanceSettings>,
  ) {}

  async execute(dto: CreateTeacherAttendanceSettingsDto, organizationId: string): Promise<TeacherAttendanceSettings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
