import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvents } from '../entities/audit_events.entity';

@Injectable()
export class DeleteAuditEventsService {
  constructor(
    @InjectRepository(AuditEvents)
    private readonly repository: Repository<AuditEvents>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
