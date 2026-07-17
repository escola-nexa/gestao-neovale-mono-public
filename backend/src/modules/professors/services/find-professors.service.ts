import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Professors } from '../entities/professors.entity';

@Injectable()
export class FindProfessorsService {
  constructor(
    @InjectRepository(Professors)
    private readonly repository: Repository<Professors>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(organizationId: string, active?: string, schoolId?: string): Promise<Professors[]> {
    const query = this.repository.createQueryBuilder('p')
      .where('p.organization_id = :organizationId', { organizationId });

    if (active === 'true') {
      query.andWhere('p.status = :status', { status: 'ACTIVE' });
    }

    if (schoolId) {
      query.innerJoin('professor_school_courses', 'psc', 'psc.professor_id = p.id AND psc.school_id = :schoolId AND psc.status = :status', { schoolId, status: 'ACTIVE' });
    }

    return query.getMany();
  }

  async findOne(id: string, organizationId: string): Promise<Professors | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }

  async getProfessorSchools(professorId: string): Promise<string[]> {
    const result = await this.dataSource.query(`
      SELECT school_id 
      FROM professor_school_courses 
      WHERE professor_id = $1 AND status = 'ACTIVE'
    `, [professorId]);
    return [...new Set(result.map((r: any) => r.school_id))] as string[];
  }

  async findByUserId(userId: string): Promise<Professors | null> {
    return this.repository.findOne({ where: { userId } as any });
  }
}
