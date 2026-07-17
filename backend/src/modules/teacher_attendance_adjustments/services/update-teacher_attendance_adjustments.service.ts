import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceAdjustments } from '../entities/teacher_attendance_adjustments.entity';
import { UpdateTeacherAttendanceAdjustmentsDto } from '../dto/update-teacher_attendance_adjustments.dto';

@Injectable()
export class UpdateTeacherAttendanceAdjustmentsService {
  constructor(
    @InjectRepository(TeacherAttendanceAdjustments)
    private readonly repository: Repository<TeacherAttendanceAdjustments>,
  ) {}

  async execute(id: string, dto: UpdateTeacherAttendanceAdjustmentsDto, organizationId: string): Promise<TeacherAttendanceAdjustments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
