import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannels } from '../entities/chat_channels.entity';

@Injectable()
export class FindChatChannelsService {
  constructor(
    @InjectRepository(ChatChannels)
    private readonly repository: Repository<ChatChannels>,
  ) {}

  async findAll(organizationId: string): Promise<ChatChannels[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatChannels | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
