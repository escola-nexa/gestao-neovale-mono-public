import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceMonthlySheets } from '../entities/teacher_attendance_monthly_sheets.entity';

@Injectable()
export class FindTeacherAttendanceMonthlySheetsService {
  constructor(
    @InjectRepository(TeacherAttendanceMonthlySheets)
    private readonly repository: Repository<TeacherAttendanceMonthlySheets>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherAttendanceMonthlySheets[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherAttendanceMonthlySheets | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
