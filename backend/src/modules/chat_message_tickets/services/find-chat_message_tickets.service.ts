import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageTickets } from '../entities/chat_message_tickets.entity';

@Injectable()
export class FindChatMessageTicketsService {
  constructor(
    @InjectRepository(ChatMessageTickets)
    private readonly repository: Repository<ChatMessageTickets>,
  ) {}

  async findAll(organizationId: string): Promise<ChatMessageTickets[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatMessageTickets | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
