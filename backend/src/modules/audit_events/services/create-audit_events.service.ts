import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvents } from '../entities/audit_events.entity';
import { CreateAuditEventsDto } from '../dto/create-audit_events.dto';

@Injectable()
export class CreateAuditEventsService {
  constructor(
    @InjectRepository(AuditEvents)
    private readonly repository: Repository<AuditEvents>,
  ) {}

  async execute(dto: CreateAuditEventsDto, organizationId: string): Promise<AuditEvents> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
