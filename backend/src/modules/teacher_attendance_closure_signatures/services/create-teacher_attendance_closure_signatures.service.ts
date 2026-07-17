import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceClosureSignatures } from '../entities/teacher_attendance_closure_signatures.entity';
import { CreateTeacherAttendanceClosureSignaturesDto } from '../dto/create-teacher_attendance_closure_signatures.dto';

@Injectable()
export class CreateTeacherAttendanceClosureSignaturesService {
  constructor(
    @InjectRepository(TeacherAttendanceClosureSignatures)
    private readonly repository: Repository<TeacherAttendanceClosureSignatures>,
  ) {}

  async execute(dto: CreateTeacherAttendanceClosureSignaturesDto, organizationId: string): Promise<TeacherAttendanceClosureSignatures> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
