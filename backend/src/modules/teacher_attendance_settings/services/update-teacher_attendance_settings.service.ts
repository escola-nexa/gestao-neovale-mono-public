import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceSettings } from '../entities/teacher_attendance_settings.entity';
import { UpdateTeacherAttendanceSettingsDto } from '../dto/update-teacher_attendance_settings.dto';

@Injectable()
export class UpdateTeacherAttendanceSettingsService {
  constructor(
    @InjectRepository(TeacherAttendanceSettings)
    private readonly repository: Repository<TeacherAttendanceSettings>,
  ) {}

  async execute(id: string, dto: UpdateTeacherAttendanceSettingsDto, organizationId: string): Promise<TeacherAttendanceSettings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
