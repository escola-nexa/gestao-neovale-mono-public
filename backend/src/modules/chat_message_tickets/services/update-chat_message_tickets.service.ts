import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageTickets } from '../entities/chat_message_tickets.entity';
import { UpdateChatMessageTicketsDto } from '../dto/update-chat_message_tickets.dto';

@Injectable()
export class UpdateChatMessageTicketsService {
  constructor(
    @InjectRepository(ChatMessageTickets)
    private readonly repository: Repository<ChatMessageTickets>,
  ) {}

  async execute(id: string, dto: UpdateChatMessageTicketsDto, organizationId: string): Promise<ChatMessageTickets> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
