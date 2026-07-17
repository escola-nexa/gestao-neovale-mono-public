import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollments } from '../entities/enrollments.entity';

@Injectable()
export class FindEnrollmentsService {
  constructor(
    @InjectRepository(Enrollments)
    private readonly repository: Repository<Enrollments>,
  ) {}

  async findAll(organizationId: string): Promise<Enrollments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Enrollments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }

  async findByStudents(studentIds: string[], organizationId: string): Promise<Enrollments[]> {
    if (!studentIds || studentIds.length === 0) return [];
    const query = this.repository.createQueryBuilder('e')
      .where('e.organization_id = :organizationId', { organizationId })
      .andWhere('e.student_id IN (:...studentIds)', { studentIds })
      .andWhere('e.status = :status', { status: 'ativa' })
      .select(['e.school_id', 'e.class_group_id']);
    return await query.getMany();
  }
}
