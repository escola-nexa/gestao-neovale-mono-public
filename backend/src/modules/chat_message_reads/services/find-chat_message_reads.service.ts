import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageReads } from '../entities/chat_message_reads.entity';

@Injectable()
export class FindChatMessageReadsService {
  constructor(
    @InjectRepository(ChatMessageReads)
    private readonly repository: Repository<ChatMessageReads>,
  ) {}

  async findAll(organizationId: string): Promise<ChatMessageReads[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatMessageReads | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
