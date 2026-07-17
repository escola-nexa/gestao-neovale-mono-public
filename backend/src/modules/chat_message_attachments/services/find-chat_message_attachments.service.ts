import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageAttachments } from '../entities/chat_message_attachments.entity';

@Injectable()
export class FindChatMessageAttachmentsService {
  constructor(
    @InjectRepository(ChatMessageAttachments)
    private readonly repository: Repository<ChatMessageAttachments>,
  ) {}

  async findAll(organizationId: string): Promise<ChatMessageAttachments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatMessageAttachments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
