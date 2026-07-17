import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteLogs } from '../entities/visit_route_logs.entity';

@Injectable()
export class FindVisitRouteLogsService {
  constructor(
    @InjectRepository(VisitRouteLogs)
    private readonly repository: Repository<VisitRouteLogs>,
  ) {}

  async findAll(organizationId: string): Promise<VisitRouteLogs[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<VisitRouteLogs | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
