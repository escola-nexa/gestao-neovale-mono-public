import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceClosureSignatures } from '../entities/teacher_attendance_closure_signatures.entity';

@Injectable()
export class DeleteTeacherAttendanceClosureSignaturesService {
  constructor(
    @InjectRepository(TeacherAttendanceClosureSignatures)
    private readonly repository: Repository<TeacherAttendanceClosureSignatures>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
