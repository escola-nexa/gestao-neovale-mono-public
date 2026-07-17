import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceAdjustments } from '../entities/teacher_attendance_adjustments.entity';
import { CreateTeacherAttendanceAdjustmentsDto } from '../dto/create-teacher_attendance_adjustments.dto';

@Injectable()
export class CreateTeacherAttendanceAdjustmentsService {
  constructor(
    @InjectRepository(TeacherAttendanceAdjustments)
    private readonly repository: Repository<TeacherAttendanceAdjustments>,
  ) {}

  async execute(dto: CreateTeacherAttendanceAdjustmentsDto, organizationId: string): Promise<TeacherAttendanceAdjustments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
