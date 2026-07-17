import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessages } from '../entities/chat_messages.entity';

@Injectable()
export class FindChatMessagesService {
  constructor(
    @InjectRepository(ChatMessages)
    private readonly repository: Repository<ChatMessages>,
  ) {}

  async findAll(organizationId: string): Promise<ChatMessages[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatMessages | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
