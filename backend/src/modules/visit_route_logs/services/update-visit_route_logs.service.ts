import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteLogs } from '../entities/visit_route_logs.entity';
import { UpdateVisitRouteLogsDto } from '../dto/update-visit_route_logs.dto';

@Injectable()
export class UpdateVisitRouteLogsService {
  constructor(
    @InjectRepository(VisitRouteLogs)
    private readonly repository: Repository<VisitRouteLogs>,
  ) {}

  async execute(id: string, dto: UpdateVisitRouteLogsDto, organizationId: string): Promise<VisitRouteLogs> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
