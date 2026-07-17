import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subjects } from '../entities/subjects.entity';

@Injectable()
export class FindSubjectsService {
  constructor(
    @InjectRepository(Subjects)
    private readonly repository: Repository<Subjects>,
  ) {}

  async findAll(organizationId: string): Promise<Subjects[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Subjects | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }

  async findForCourses(courseIds: string[], organizationId: string): Promise<Subjects[]> {
    if (!courseIds || courseIds.length === 0) return [];
    const query = this.repository.createQueryBuilder('s')
      .where('s.organization_id = :organizationId', { organizationId })
      .andWhere('s.course_id IN (:...courseIds)', { courseIds })
      .select(['s.id', 's.nome', 's.course_id', 's.status']);
    return await query.getMany();
  }
}
