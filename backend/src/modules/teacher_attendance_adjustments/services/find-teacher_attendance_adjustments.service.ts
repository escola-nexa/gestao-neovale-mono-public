import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceAdjustments } from '../entities/teacher_attendance_adjustments.entity';

@Injectable()
export class FindTeacherAttendanceAdjustmentsService {
  constructor(
    @InjectRepository(TeacherAttendanceAdjustments)
    private readonly repository: Repository<TeacherAttendanceAdjustments>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherAttendanceAdjustments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherAttendanceAdjustments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
