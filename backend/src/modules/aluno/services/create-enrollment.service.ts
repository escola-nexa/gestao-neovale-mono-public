import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';

@Injectable()
export class CreateEnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async execute(dto: any, organizationId: string): Promise<Enrollment> {
    const enrollment = this.enrollmentRepository.create({
      organizationId,
      studentId: dto.student_id,
      schoolId: dto.school_id,
      courseId: dto.course_id,
      classGroupId: dto.class_group_id,
      anoLetivo: dto.ano_letivo,
      dataMatricula: dto.data_matricula,
      dataEncerramento: dto.data_encerramento,
      status: dto.status,
      observacoes: dto.observacoes,
    });
    
    return await this.enrollmentRepository.save(enrollment);
  }
}
