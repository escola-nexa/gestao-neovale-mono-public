import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessages } from '../entities/chat_messages.entity';
import { UpdateChatMessagesDto } from '../dto/update-chat_messages.dto';

@Injectable()
export class UpdateChatMessagesService {
  constructor(
    @InjectRepository(ChatMessages)
    private readonly repository: Repository<ChatMessages>,
  ) {}

  async execute(id: string, dto: UpdateChatMessagesDto, organizationId: string): Promise<ChatMessages> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
