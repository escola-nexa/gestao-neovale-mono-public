import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentGrades } from '../entities/student_grades.entity';

@Injectable()
export class DeleteStudentGradesService {
  constructor(
    @InjectRepository(StudentGrades)
    private readonly repository: Repository<StudentGrades>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
