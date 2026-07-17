import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageTickets } from '../entities/chat_message_tickets.entity';
import { CreateChatMessageTicketsDto } from '../dto/create-chat_message_tickets.dto';

@Injectable()
export class CreateChatMessageTicketsService {
  constructor(
    @InjectRepository(ChatMessageTickets)
    private readonly repository: Repository<ChatMessageTickets>,
  ) {}

  async execute(dto: CreateChatMessageTicketsDto, organizationId: string): Promise<ChatMessageTickets> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
