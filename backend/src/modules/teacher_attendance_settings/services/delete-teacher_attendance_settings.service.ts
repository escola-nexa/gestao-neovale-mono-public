import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceSettings } from '../entities/teacher_attendance_settings.entity';

@Injectable()
export class DeleteTeacherAttendanceSettingsService {
  constructor(
    @InjectRepository(TeacherAttendanceSettings)
    private readonly repository: Repository<TeacherAttendanceSettings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
