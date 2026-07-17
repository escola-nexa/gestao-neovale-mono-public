import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannels } from '../entities/chat_channels.entity';

@Injectable()
export class DeleteChatChannelsService {
  constructor(
    @InjectRepository(ChatChannels)
    private readonly repository: Repository<ChatChannels>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
