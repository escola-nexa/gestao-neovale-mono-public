import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteLogs } from '../entities/visit_route_logs.entity';

@Injectable()
export class DeleteVisitRouteLogsService {
  constructor(
    @InjectRepository(VisitRouteLogs)
    private readonly repository: Repository<VisitRouteLogs>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
