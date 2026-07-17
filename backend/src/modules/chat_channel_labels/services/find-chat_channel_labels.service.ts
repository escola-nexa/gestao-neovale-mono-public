import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelLabels } from '../entities/chat_channel_labels.entity';

@Injectable()
export class FindChatChannelLabelsService {
  constructor(
    @InjectRepository(ChatChannelLabels)
    private readonly repository: Repository<ChatChannelLabels>,
  ) {}

  async findAll(organizationId: string): Promise<ChatChannelLabels[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatChannelLabels | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
