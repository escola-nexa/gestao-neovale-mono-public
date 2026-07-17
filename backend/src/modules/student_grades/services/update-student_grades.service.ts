import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentGrades } from '../entities/student_grades.entity';
import { UpdateStudentGradesDto } from '../dto/update-student_grades.dto';

@Injectable()
export class UpdateStudentGradesService {
  constructor(
    @InjectRepository(StudentGrades)
    private readonly repository: Repository<StudentGrades>,
  ) {}

  async execute(id: string, dto: UpdateStudentGradesDto, organizationId: string): Promise<StudentGrades> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
