import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageReactions } from '../entities/chat_message_reactions.entity';

@Injectable()
export class FindChatMessageReactionsService {
  constructor(
    @InjectRepository(ChatMessageReactions)
    private readonly repository: Repository<ChatMessageReactions>,
  ) {}

  async findAll(organizationId: string): Promise<ChatMessageReactions[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatMessageReactions | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
