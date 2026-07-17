import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageMentions } from '../entities/chat_message_mentions.entity';

@Injectable()
export class FindChatMessageMentionsService {
  constructor(
    @InjectRepository(ChatMessageMentions)
    private readonly repository: Repository<ChatMessageMentions>,
  ) {}

  async findAll(organizationId: string): Promise<ChatMessageMentions[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatMessageMentions | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
