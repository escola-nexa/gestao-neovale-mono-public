import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceMonthlySheets } from '../entities/teacher_attendance_monthly_sheets.entity';
import { CreateTeacherAttendanceMonthlySheetsDto } from '../dto/create-teacher_attendance_monthly_sheets.dto';

@Injectable()
export class CreateTeacherAttendanceMonthlySheetsService {
  constructor(
    @InjectRepository(TeacherAttendanceMonthlySheets)
    private readonly repository: Repository<TeacherAttendanceMonthlySheets>,
  ) {}

  async execute(dto: CreateTeacherAttendanceMonthlySheetsDto, organizationId: string): Promise<TeacherAttendanceMonthlySheets> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
