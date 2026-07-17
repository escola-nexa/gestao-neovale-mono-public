import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvents } from '../entities/audit_events.entity';
import { UpdateAuditEventsDto } from '../dto/update-audit_events.dto';

@Injectable()
export class UpdateAuditEventsService {
  constructor(
    @InjectRepository(AuditEvents)
    private readonly repository: Repository<AuditEvents>,
  ) {}

  async execute(id: string, dto: UpdateAuditEventsDto, organizationId: string): Promise<AuditEvents> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
