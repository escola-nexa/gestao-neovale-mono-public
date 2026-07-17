import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceClosureSignatures } from '../entities/teacher_attendance_closure_signatures.entity';

@Injectable()
export class FindTeacherAttendanceClosureSignaturesService {
  constructor(
    @InjectRepository(TeacherAttendanceClosureSignatures)
    private readonly repository: Repository<TeacherAttendanceClosureSignatures>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherAttendanceClosureSignatures[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherAttendanceClosureSignatures | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
