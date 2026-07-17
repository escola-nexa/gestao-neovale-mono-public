import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSavedMessages } from '../entities/chat_saved_messages.entity';

@Injectable()
export class FindChatSavedMessagesService {
  constructor(
    @InjectRepository(ChatSavedMessages)
    private readonly repository: Repository<ChatSavedMessages>,
  ) {}

  async findAll(organizationId: string): Promise<ChatSavedMessages[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatSavedMessages | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
