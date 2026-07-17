import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketChecklistItems } from '../entities/ticket_checklist_items.entity';

@Injectable()
export class FindTicketChecklistItemsService {
  constructor(
    @InjectRepository(TicketChecklistItems)
    private readonly repository: Repository<TicketChecklistItems>,
  ) {}

  async findAll(organizationId: string): Promise<TicketChecklistItems[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TicketChecklistItems | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
