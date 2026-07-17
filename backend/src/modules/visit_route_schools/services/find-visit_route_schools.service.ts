import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteSchools } from '../entities/visit_route_schools.entity';

@Injectable()
export class FindVisitRouteSchoolsService {
  constructor(
    @InjectRepository(VisitRouteSchools)
    private readonly repository: Repository<VisitRouteSchools>,
  ) {}

  async findAll(organizationId: string): Promise<VisitRouteSchools[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<VisitRouteSchools | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
