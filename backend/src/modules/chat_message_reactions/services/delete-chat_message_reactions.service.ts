import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageReactions } from '../entities/chat_message_reactions.entity';

@Injectable()
export class DeleteChatMessageReactionsService {
  constructor(
    @InjectRepository(ChatMessageReactions)
    private readonly repository: Repository<ChatMessageReactions>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
