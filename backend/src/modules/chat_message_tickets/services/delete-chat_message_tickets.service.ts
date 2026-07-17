import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageTickets } from '../entities/chat_message_tickets.entity';

@Injectable()
export class DeleteChatMessageTicketsService {
  constructor(
    @InjectRepository(ChatMessageTickets)
    private readonly repository: Repository<ChatMessageTickets>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
