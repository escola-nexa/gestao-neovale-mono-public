import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessages } from '../entities/chat_messages.entity';
import { CreateChatMessagesDto } from '../dto/create-chat_messages.dto';

@Injectable()
export class CreateChatMessagesService {
  constructor(
    @InjectRepository(ChatMessages)
    private readonly repository: Repository<ChatMessages>,
  ) {}

  async execute(dto: CreateChatMessagesDto, organizationId: string): Promise<ChatMessages> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
