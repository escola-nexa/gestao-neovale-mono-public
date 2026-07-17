import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalAccessLogs } from '../entities/external_access_logs.entity';

@Injectable()
export class FindExternalAccessLogsService {
  constructor(
    @InjectRepository(ExternalAccessLogs)
    private readonly repository: Repository<ExternalAccessLogs>,
  ) {}

  async findAll(organizationId: string): Promise<ExternalAccessLogs[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ExternalAccessLogs | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
