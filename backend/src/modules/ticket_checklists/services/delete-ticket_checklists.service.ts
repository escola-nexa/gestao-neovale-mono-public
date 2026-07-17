import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketChecklists } from '../entities/ticket_checklists.entity';

@Injectable()
export class DeleteTicketChecklistsService {
  constructor(
    @InjectRepository(TicketChecklists)
    private readonly repository: Repository<TicketChecklists>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
