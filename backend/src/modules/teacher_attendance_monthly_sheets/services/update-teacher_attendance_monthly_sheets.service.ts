import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceMonthlySheets } from '../entities/teacher_attendance_monthly_sheets.entity';
import { UpdateTeacherAttendanceMonthlySheetsDto } from '../dto/update-teacher_attendance_monthly_sheets.dto';

@Injectable()
export class UpdateTeacherAttendanceMonthlySheetsService {
  constructor(
    @InjectRepository(TeacherAttendanceMonthlySheets)
    private readonly repository: Repository<TeacherAttendanceMonthlySheets>,
  ) {}

  async execute(id: string, dto: UpdateTeacherAttendanceMonthlySheetsDto, organizationId: string): Promise<TeacherAttendanceMonthlySheets> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
