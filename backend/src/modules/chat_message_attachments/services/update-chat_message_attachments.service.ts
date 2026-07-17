import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageAttachments } from '../entities/chat_message_attachments.entity';
import { UpdateChatMessageAttachmentsDto } from '../dto/update-chat_message_attachments.dto';

@Injectable()
export class UpdateChatMessageAttachmentsService {
  constructor(
    @InjectRepository(ChatMessageAttachments)
    private readonly repository: Repository<ChatMessageAttachments>,
  ) {}

  async execute(id: string, dto: UpdateChatMessageAttachmentsDto, organizationId: string): Promise<ChatMessageAttachments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
