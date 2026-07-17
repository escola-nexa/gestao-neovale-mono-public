import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelLabels } from '../entities/chat_channel_labels.entity';

@Injectable()
export class DeleteChatChannelLabelsService {
  constructor(
    @InjectRepository(ChatChannelLabels)
    private readonly repository: Repository<ChatChannelLabels>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
