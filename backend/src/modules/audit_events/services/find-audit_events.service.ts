import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvents } from '../entities/audit_events.entity';

@Injectable()
export class FindAuditEventsService {
  constructor(
    @InjectRepository(AuditEvents)
    private readonly repository: Repository<AuditEvents>,
  ) {}

  async findAll(organizationId: string): Promise<AuditEvents[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<AuditEvents | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
