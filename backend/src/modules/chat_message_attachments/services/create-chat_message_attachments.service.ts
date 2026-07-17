import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageAttachments } from '../entities/chat_message_attachments.entity';
import { CreateChatMessageAttachmentsDto } from '../dto/create-chat_message_attachments.dto';

@Injectable()
export class CreateChatMessageAttachmentsService {
  constructor(
    @InjectRepository(ChatMessageAttachments)
    private readonly repository: Repository<ChatMessageAttachments>,
  ) {}

  async execute(dto: CreateChatMessageAttachmentsDto, organizationId: string): Promise<ChatMessageAttachments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
