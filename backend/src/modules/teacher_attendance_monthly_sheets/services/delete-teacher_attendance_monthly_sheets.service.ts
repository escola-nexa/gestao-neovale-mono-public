import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceMonthlySheets } from '../entities/teacher_attendance_monthly_sheets.entity';

@Injectable()
export class DeleteTeacherAttendanceMonthlySheetsService {
  constructor(
    @InjectRepository(TeacherAttendanceMonthlySheets)
    private readonly repository: Repository<TeacherAttendanceMonthlySheets>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
