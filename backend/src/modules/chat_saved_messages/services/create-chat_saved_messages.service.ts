import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSavedMessages } from '../entities/chat_saved_messages.entity';
import { CreateChatSavedMessagesDto } from '../dto/create-chat_saved_messages.dto';

@Injectable()
export class CreateChatSavedMessagesService {
  constructor(
    @InjectRepository(ChatSavedMessages)
    private readonly repository: Repository<ChatSavedMessages>,
  ) {}

  async execute(dto: CreateChatSavedMessagesDto, organizationId: string): Promise<ChatSavedMessages> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
