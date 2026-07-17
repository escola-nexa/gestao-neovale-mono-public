import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageMentions } from '../entities/chat_message_mentions.entity';
import { UpdateChatMessageMentionsDto } from '../dto/update-chat_message_mentions.dto';

@Injectable()
export class UpdateChatMessageMentionsService {
  constructor(
    @InjectRepository(ChatMessageMentions)
    private readonly repository: Repository<ChatMessageMentions>,
  ) {}

  async execute(id: string, dto: UpdateChatMessageMentionsDto, organizationId: string): Promise<ChatMessageMentions> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
