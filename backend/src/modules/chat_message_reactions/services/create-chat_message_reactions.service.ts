import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageReactions } from '../entities/chat_message_reactions.entity';
import { CreateChatMessageReactionsDto } from '../dto/create-chat_message_reactions.dto';

@Injectable()
export class CreateChatMessageReactionsService {
  constructor(
    @InjectRepository(ChatMessageReactions)
    private readonly repository: Repository<ChatMessageReactions>,
  ) {}

  async execute(dto: CreateChatMessageReactionsDto, organizationId: string): Promise<ChatMessageReactions> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
