import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSavedMessages } from '../entities/chat_saved_messages.entity';

@Injectable()
export class DeleteChatSavedMessagesService {
  constructor(
    @InjectRepository(ChatSavedMessages)
    private readonly repository: Repository<ChatSavedMessages>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
