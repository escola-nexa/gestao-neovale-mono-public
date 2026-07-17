import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherPlannings } from '../entities/teacher_plannings.entity';

@Injectable()
export class FindTeacherPlanningsService {
  constructor(
    @InjectRepository(TeacherPlannings)
    private readonly repository: Repository<TeacherPlannings>,
  ) {}

  async findAll(organizationId: string, professorId?: string, schoolId?: string, bimesterId?: string, status?: string): Promise<TeacherPlannings[]> {
    const where: any = { organizationId };
    if (professorId) where.professorId = professorId;
    if (schoolId) where.schoolId = schoolId;
    if (bimesterId) where.bimesterId = bimesterId;
    if (status) where.status = status;
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherPlannings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
