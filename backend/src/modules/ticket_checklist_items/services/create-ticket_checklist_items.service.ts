import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketChecklistItems } from '../entities/ticket_checklist_items.entity';
import { CreateTicketChecklistItemsDto } from '../dto/create-ticket_checklist_items.dto';

@Injectable()
export class CreateTicketChecklistItemsService {
  constructor(
    @InjectRepository(TicketChecklistItems)
    private readonly repository: Repository<TicketChecklistItems>,
  ) {}

  async execute(dto: CreateTicketChecklistItemsDto, organizationId: string): Promise<TicketChecklistItems> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
