import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassGroups } from '../entities/class_groups.entity';

@Injectable()
export class FindClassGroupsService {
  constructor(
    @InjectRepository(ClassGroups)
    private readonly repository: Repository<ClassGroups>,
  ) {}

  async findAll(organizationId: string, schoolId?: string, status?: string, calendarId?: string): Promise<ClassGroups[]> {
    const where: any = { organizationId };
    if (schoolId) where.schoolId = schoolId;
    if (status) where.status = status;
    if (calendarId) where.calendarId = calendarId;
    return this.repository.find({ where, order: { nome: 'ASC' } });
  }

  async findOne(id: string, organizationId: string): Promise<ClassGroups | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
