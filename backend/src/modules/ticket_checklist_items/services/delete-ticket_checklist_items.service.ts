import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketChecklistItems } from '../entities/ticket_checklist_items.entity';

@Injectable()
export class DeleteTicketChecklistItemsService {
  constructor(
    @InjectRepository(TicketChecklistItems)
    private readonly repository: Repository<TicketChecklistItems>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
