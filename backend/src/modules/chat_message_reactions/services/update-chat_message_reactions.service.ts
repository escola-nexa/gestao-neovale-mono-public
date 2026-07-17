import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageReactions } from '../entities/chat_message_reactions.entity';
import { UpdateChatMessageReactionsDto } from '../dto/update-chat_message_reactions.dto';

@Injectable()
export class UpdateChatMessageReactionsService {
  constructor(
    @InjectRepository(ChatMessageReactions)
    private readonly repository: Repository<ChatMessageReactions>,
  ) {}

  async execute(id: string, dto: UpdateChatMessageReactionsDto, organizationId: string): Promise<ChatMessageReactions> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
