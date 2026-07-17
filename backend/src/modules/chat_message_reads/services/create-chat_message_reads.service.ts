import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageReads } from '../entities/chat_message_reads.entity';
import { CreateChatMessageReadsDto } from '../dto/create-chat_message_reads.dto';

@Injectable()
export class CreateChatMessageReadsService {
  constructor(
    @InjectRepository(ChatMessageReads)
    private readonly repository: Repository<ChatMessageReads>,
  ) {}

  async execute(dto: CreateChatMessageReadsDto, organizationId: string): Promise<ChatMessageReads> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
