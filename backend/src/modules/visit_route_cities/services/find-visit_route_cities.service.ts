import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteCities } from '../entities/visit_route_cities.entity';

@Injectable()
export class FindVisitRouteCitiesService {
  constructor(
    @InjectRepository(VisitRouteCities)
    private readonly repository: Repository<VisitRouteCities>,
  ) {}

  async findAll(organizationId: string): Promise<VisitRouteCities[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<VisitRouteCities | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
