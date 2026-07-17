import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessages } from '../entities/chat_messages.entity';

@Injectable()
export class DeleteChatMessagesService {
  constructor(
    @InjectRepository(ChatMessages)
    private readonly repository: Repository<ChatMessages>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
