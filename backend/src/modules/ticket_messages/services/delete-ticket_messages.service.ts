import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketMessages } from '../entities/ticket_messages.entity';

@Injectable()
export class DeleteTicketMessagesService {
  constructor(
    @InjectRepository(TicketMessages)
    private readonly repository: Repository<TicketMessages>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
