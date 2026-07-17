import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSavedMessages } from '../entities/chat_saved_messages.entity';
import { UpdateChatSavedMessagesDto } from '../dto/update-chat_saved_messages.dto';

@Injectable()
export class UpdateChatSavedMessagesService {
  constructor(
    @InjectRepository(ChatSavedMessages)
    private readonly repository: Repository<ChatSavedMessages>,
  ) {}

  async execute(id: string, dto: UpdateChatSavedMessagesDto, organizationId: string): Promise<ChatSavedMessages> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
