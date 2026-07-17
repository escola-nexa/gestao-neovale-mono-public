import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitUsers } from '../entities/school_visit_users.entity';

@Injectable()
export class FindSchoolVisitUsersService {
  constructor(
    @InjectRepository(SchoolVisitUsers)
    private readonly repository: Repository<SchoolVisitUsers>,
  ) {}

  async findAll(organizationId: string): Promise<SchoolVisitUsers[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SchoolVisitUsers | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
