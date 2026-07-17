import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageAttachments } from '../entities/chat_message_attachments.entity';

@Injectable()
export class DeleteChatMessageAttachmentsService {
  constructor(
    @InjectRepository(ChatMessageAttachments)
    private readonly repository: Repository<ChatMessageAttachments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
