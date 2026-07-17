import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageReads } from '../entities/chat_message_reads.entity';

@Injectable()
export class DeleteChatMessageReadsService {
  constructor(
    @InjectRepository(ChatMessageReads)
    private readonly repository: Repository<ChatMessageReads>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
