import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageMentions } from '../entities/chat_message_mentions.entity';
import { CreateChatMessageMentionsDto } from '../dto/create-chat_message_mentions.dto';

@Injectable()
export class CreateChatMessageMentionsService {
  constructor(
    @InjectRepository(ChatMessageMentions)
    private readonly repository: Repository<ChatMessageMentions>,
  ) {}

  async execute(dto: CreateChatMessageMentionsDto, organizationId: string): Promise<ChatMessageMentions> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
