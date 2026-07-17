import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageLabels } from '../entities/chat_message_labels.entity';

@Injectable()
export class DeleteChatMessageLabelsService {
  constructor(
    @InjectRepository(ChatMessageLabels)
    private readonly repository: Repository<ChatMessageLabels>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
