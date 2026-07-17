import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketChecklistItems } from '../entities/ticket_checklist_items.entity';
import { UpdateTicketChecklistItemsDto } from '../dto/update-ticket_checklist_items.dto';

@Injectable()
export class UpdateTicketChecklistItemsService {
  constructor(
    @InjectRepository(TicketChecklistItems)
    private readonly repository: Repository<TicketChecklistItems>,
  ) {}

  async execute(id: string, dto: UpdateTicketChecklistItemsDto, organizationId: string): Promise<TicketChecklistItems> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
