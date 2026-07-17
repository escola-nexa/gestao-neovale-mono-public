import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentGrades } from '../entities/student_grades.entity';
import { CreateStudentGradesDto } from '../dto/create-student_grades.dto';

@Injectable()
export class CreateStudentGradesService {
  constructor(
    @InjectRepository(StudentGrades)
    private readonly repository: Repository<StudentGrades>,
  ) {}

  async execute(dto: CreateStudentGradesDto, organizationId: string): Promise<StudentGrades> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
