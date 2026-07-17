import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteLogs } from '../entities/visit_route_logs.entity';
import { CreateVisitRouteLogsDto } from '../dto/create-visit_route_logs.dto';

@Injectable()
export class CreateVisitRouteLogsService {
  constructor(
    @InjectRepository(VisitRouteLogs)
    private readonly repository: Repository<VisitRouteLogs>,
  ) {}

  async execute(dto: CreateVisitRouteLogsDto, organizationId: string): Promise<VisitRouteLogs> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
