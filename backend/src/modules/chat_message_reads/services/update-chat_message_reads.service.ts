import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageReads } from '../entities/chat_message_reads.entity';
import { UpdateChatMessageReadsDto } from '../dto/update-chat_message_reads.dto';

@Injectable()
export class UpdateChatMessageReadsService {
  constructor(
    @InjectRepository(ChatMessageReads)
    private readonly repository: Repository<ChatMessageReads>,
  ) {}

  async execute(id: string, dto: UpdateChatMessageReadsDto, organizationId: string): Promise<ChatMessageReads> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
