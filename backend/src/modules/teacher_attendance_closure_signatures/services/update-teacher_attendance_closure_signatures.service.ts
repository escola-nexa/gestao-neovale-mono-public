import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceClosureSignatures } from '../entities/teacher_attendance_closure_signatures.entity';
import { UpdateTeacherAttendanceClosureSignaturesDto } from '../dto/update-teacher_attendance_closure_signatures.dto';

@Injectable()
export class UpdateTeacherAttendanceClosureSignaturesService {
  constructor(
    @InjectRepository(TeacherAttendanceClosureSignatures)
    private readonly repository: Repository<TeacherAttendanceClosureSignatures>,
  ) {}

  async execute(id: string, dto: UpdateTeacherAttendanceClosureSignaturesDto, organizationId: string): Promise<TeacherAttendanceClosureSignatures> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
