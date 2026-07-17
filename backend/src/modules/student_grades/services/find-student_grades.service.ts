import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentGrades } from '../entities/student_grades.entity';

@Injectable()
export class FindStudentGradesService {
  constructor(
    @InjectRepository(StudentGrades)
    private readonly repository: Repository<StudentGrades>,
  ) {}

  async findAll(organizationId: string): Promise<StudentGrades[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<StudentGrades | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
